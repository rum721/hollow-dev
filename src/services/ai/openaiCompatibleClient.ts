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
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const endpoint = `${baseUrl}/chat/completions`;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    // OpenAI newer models (gpt-5.x, o3, etc.) require max_completion_tokens
    // instead of max_tokens. Other providers still use max_tokens.
    const isOpenAI = baseUrl.includes('api.openai.com');
    const tokenLimitKey = isOpenAI ? 'max_completion_tokens' : 'max_tokens';

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
