import type { ChatMessage, StreamCallbacks, RequestOptions } from './types';
import { apiFetch } from './apiFetch';

/**
 * Generic OpenAI-compatible streaming chat client.
 * Works with: OpenAI, Google Gemini, DeepSeek, GLM, Qwen, MiniMax,
 * Moonshot, Baichuan, Yi, StepFun, Doubao, Spark, etc.
 */
export async function streamOpenAICompatibleChat(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: RequestOptions,
  signal?: AbortSignal,
): Promise<void> {
  try {
    // OpenAI newer models (gpt-5.x, o1, o3, etc.) require:
    //   - "developer" role instead of "system" role
    //   - "max_completion_tokens" instead of "max_tokens"
    // Older OpenAI models (gpt-4o, gpt-4o-mini) still use "system" and "max_tokens".
    const isOpenAI = baseUrl.includes('api.openai.com');
    const isNewOpenAIModel = isOpenAI && /^(gpt-5|o[1-9])/.test(model);
    const systemRole = isNewOpenAIModel ? 'developer' : 'system';
    const tokenLimitKey = isNewOpenAIModel ? 'max_completion_tokens' : 'max_tokens';

    const fullMessages: ChatMessage[] = [
      { role: systemRole as ChatMessage['role'], content: systemPrompt },
      ...messages,
    ];

    const endpoint = `${baseUrl}/chat/completions`;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    const reader = typeof ReadableStream !== 'undefined'
      ? await tryStreamingRequest() : null;

    // ── Streaming path (web) ──
    if (reader) {
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            callbacks.onComplete(accumulated);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              accumulated += token;
              callbacks.onToken(token);
            }
          } catch {}
        }
      }

      callbacks.onComplete(accumulated);
      return;
    }

    // ── Non-streaming fallback (React Native) ──
    const response = await apiFetch(endpoint, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        model,
        [tokenLimitKey]: options?.maxTokens ?? 4096,
        stream: false,
        ...(isOpenAI ? {} : { store: options?.store ?? true }),
        messages: fullMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    if (content) callbacks.onToken(content);
    callbacks.onComplete(content);

    // ── Helper: attempt streaming fetch ──
    async function tryStreamingRequest(): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
      try {
        const res = await apiFetch(endpoint, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            model,
            [tokenLimitKey]: options?.maxTokens ?? 4096,
            stream: true,
            ...(isOpenAI ? {} : { store: options?.store ?? true }),
            messages: fullMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal,
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`API error ${res.status}: ${err}`);
        }

        const r = res.body?.getReader();
        return r ?? null;
      } catch {
        return null;
      }
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
