import type { ChatMessage, StreamCallbacks, RequestOptions } from './types';
import { apiFetch } from './apiFetch';

export async function streamAnthropicChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: RequestOptions,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const effectiveMaxTokens = options?.maxTokens ?? 4096;
    const requestBody = JSON.stringify({
      model: model === 'claude-opus-4-6' ? 'claude-opus-4-6' : model,
      max_tokens: effectiveMaxTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(options?.store !== false && {
        metadata: { user_id: 'hollow-user' },
      }),
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
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
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              accumulated += parsed.delta.text;
              callbacks.onToken(parsed.delta.text);
            } else if (parsed.type === 'message_stop') {
              callbacks.onComplete(accumulated);
              return;
            }
          } catch {}
        }
      }

      callbacks.onComplete(accumulated);
      return;
    }

    // ── Non-streaming fallback (React Native) ──
    const response = await apiFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model === 'claude-opus-4-6' ? 'claude-opus-4-6' : model,
        max_tokens: effectiveMaxTokens,
        system: systemPrompt,
        stream: false,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        ...(options?.store !== false && {
          metadata: { user_id: 'hollow-user' },
        }),
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text ?? '';
    if (content) callbacks.onToken(content);
    callbacks.onComplete(content);

    // ── Helper: attempt streaming fetch ──
    async function tryStreamingRequest(): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
      try {
        const res = await apiFetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...JSON.parse(requestBody),
            stream: true,
          }),
          signal,
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Anthropic API error ${res.status}: ${err}`);
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
