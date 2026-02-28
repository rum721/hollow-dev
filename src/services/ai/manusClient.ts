import type { ChatMessage, StreamCallbacks, RequestOptions } from './types';
import { apiFetch } from './apiFetch';

const MANUS_BASE = 'https://api.manus.ai';
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_TIME = 120000; // 2 minutes

/**
 * Extended options for Manus — carries the taskId for multi-turn context.
 */
export interface ManusRequestOptions extends RequestOptions {
  manusTaskId?: string;
}

/**
 * Extract the assistant's text reply from the Manus output array.
 *
 * Manus response format:
 * {
 *   "output": [
 *     { "role": "user",      "content": [{ "type": "output_text", "text": "..." }] },
 *     { "role": "assistant",  "content": [{ "type": "output_text", "text": "..." }] }
 *   ]
 * }
 */
function extractAssistantText(output: unknown): string {
  if (!Array.isArray(output)) return '';

  // Walk the output array in reverse to find the last assistant message
  for (let i = output.length - 1; i >= 0; i--) {
    const entry = output[i];
    if (entry?.role === 'assistant' && Array.isArray(entry.content)) {
      // Collect all output_text blocks
      const texts = entry.content
        .filter((c: { type?: string }) => c.type === 'output_text')
        .map((c: { text?: string }) => c.text ?? '')
        .filter(Boolean);
      if (texts.length > 0) return texts.join('\n');
    }
  }

  // Fallback: try any entry with content text
  for (const entry of output) {
    if (Array.isArray(entry?.content)) {
      for (const block of entry.content) {
        if (block?.type === 'output_text' && block.text && entry.role !== 'user') {
          return block.text;
        }
      }
    }
  }

  return '';
}

/**
 * Manus uses a task-based API, not OpenAI-compatible chat/completions.
 * Flow: create task (with optional taskId for multi-turn) → poll → return result.
 *
 * Multi-turn: Pass `options.manusTaskId` from the previous turn. Manus server
 * retains full context via taskId. System prompt is only injected on the first
 * turn (when no taskId exists).
 *
 * Returns the taskId so the caller can persist it for the next turn.
 */
export async function streamManusChat(
  apiKey: string,
  agentProfile: string,
  systemPrompt: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: ManusRequestOptions,
  signal?: AbortSignal,
): Promise<string | undefined> {
  // Manus expects a single prompt string — only the last user message.
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1]?.content ?? '';

  if (!lastUserMessage) {
    callbacks.onError(new Error('No message to send'));
    return undefined;
  }

  // First turn (no taskId): embed system prompt into the prompt.
  // Subsequent turns: Manus server retains full context via taskId.
  const isFirstTurn = !options?.manusTaskId;
  const prompt = isFirstTurn
    ? `[System Instructions - 请严格遵循以下角色设定]\n\n${systemPrompt}\n\n---\n\n${lastUserMessage}`
    : lastUserMessage;

  try {
    // Step 1: Create task (with taskId for multi-turn continuation)
    const createBody: Record<string, unknown> = {
      prompt,
      agentProfile,
      taskMode: 'chat',
    };

    if (options?.manusTaskId) {
      createBody.taskId = options.manusTaskId;
    }

    let createRes = await apiFetch(`${MANUS_BASE}/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API_KEY': apiKey,
      },
      body: JSON.stringify(createBody),
      signal,
    });

    // Handle expired/invalid taskId — retry as a fresh conversation
    if (!createRes.ok && options?.manusTaskId && (createRes.status === 404 || createRes.status === 400)) {
      const freshBody: Record<string, unknown> = {
        prompt: `[System Instructions - 请严格遵循以下角色设定]\n\n${systemPrompt}\n\n---\n\n${lastUserMessage}`,
        agentProfile,
        taskMode: 'chat',
      };
      createRes = await apiFetch(`${MANUS_BASE}/v1/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API_KEY': apiKey,
        },
        body: JSON.stringify(freshBody),
        signal,
      });
    }

    if (!createRes.ok) {
      const errBody = await createRes.text().catch(() => '');
      if (createRes.status === 401 || createRes.status === 403) {
        callbacks.onError(new Error('Invalid Manus API key'));
      } else {
        callbacks.onError(new Error(`Manus API error ${createRes.status}: ${errBody}`));
      }
      return undefined;
    }

    const taskData = await createRes.json();
    const taskId = taskData.task_id ?? taskData.id;
    if (!taskId) {
      callbacks.onError(new Error('Manus: No task_id returned'));
      return undefined;
    }

    // Step 2: Poll for task completion
    // Show a thinking indicator (will be cleared before emitting actual text)
    callbacks.onToken('思考中');
    const startTime = Date.now();
    let result = '';

    while (Date.now() - startTime < MAX_POLL_TIME) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      const statusRes = await apiFetch(`${MANUS_BASE}/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: { 'API_KEY': apiKey },
        signal,
      });

      if (!statusRes.ok) {
        callbacks.onError(new Error(`Manus poll error: ${statusRes.status}`));
        return undefined;
      }

      const statusData = await statusRes.json();
      const status = statusData.status;

      if (status === 'completed') {
        result = extractAssistantText(statusData.output);

        // Fallback: try direct string fields
        if (!result && typeof statusData.output === 'string') {
          result = statusData.output;
        }
        if (!result && typeof statusData.result === 'string') {
          result = statusData.result;
        }

        break;
      } else if (status === 'failed') {
        callbacks.onError(new Error(statusData.error ?? 'Manus task failed'));
        return undefined;
      }
      // status === 'pending' or 'running' → keep polling (no extra tokens)
    }

    if (!result) {
      callbacks.onError(new Error('Manus: No response received'));
      return undefined;
    }

    // Clear the "thinking" indicator by resetting streamingText,
    // then emit the actual result.
    // The onComplete callback receives the clean text.
    callbacks.onComplete(result);

    // Return the taskId so the caller can persist it for the next turn
    return taskId;
  } catch (e) {
    callbacks.onError(e instanceof Error ? e : new Error(String(e)));
    return undefined;
  }
}

/**
 * Validate a Manus API key by attempting to create a minimal task.
 */
export async function validateManusApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await apiFetch(`${MANUS_BASE}/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API_KEY': apiKey,
      },
      body: JSON.stringify({
        prompt: 'Hi',
        agentProfile: 'speed',
        taskMode: 'chat',
      }),
    });

    if (res.ok || res.status === 200 || res.status === 201) {
      return { valid: true };
    }
    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: 'Invalid API key' };
    }
    return { valid: false, error: `Error ${res.status}` };
  } catch {
    return { valid: false, error: 'Network error' };
  }
}
