import type { ChatMessage, StreamCallbacks, RequestOptions } from './types';
import { apiFetch } from './apiFetch';

export async function streamOpenAIChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: RequestOptions,
): Promise<void> {
  try {
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

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
    const response = await apiFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model === 'gpt-5.2' ? 'gpt-4o' : model,
        max_tokens: options?.maxTokens ?? 4096,
        stream: false,
        store: options?.store ?? true,
        messages: fullMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    if (content) callbacks.onToken(content);
    callbacks.onComplete(content);

    // ── Helper: attempt streaming fetch ──
    async function tryStreamingRequest(): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
      try {
        const res = await apiFetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model === 'gpt-5.2' ? 'gpt-4o' : model,
            max_tokens: options?.maxTokens ?? 4096,
            stream: true,
            store: options?.store ?? true,
            messages: fullMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`OpenAI API error ${res.status}: ${err}`);
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
