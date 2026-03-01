/**
 * Session Summarizer — Phase 4 of Memory System v2.0
 *
 * Generates a concise summary when the user leaves a conversation session.
 * Uses a lightweight model call to produce structured JSON with summary,
 * key topics, and overall mood.
 */

import { streamOpenAICompatibleChat } from './openaiCompatibleClient';
import { streamAnthropicChat } from './anthropicClient';
import { getModelInfo, PROVIDER_BASE_URLS } from './models';
import { textOf } from './contentUtils';
import type { ChatMessage } from './types';

// ── Summary prompt ──

const SUMMARY_SYSTEM_PROMPT = `你是 Hollow 的对话摘要系统。请用 2-3 句话总结以下对话的核心内容。

要求：
1. 重点记录用户分享了什么、讨论了什么话题、情绪状态如何
2. 用第三人称描述（"用户..."）
3. 标注整体情绪基调
4. 提取 2-5 个关键话题标签（中文）

输出格式（严格 JSON，不要有其他文字）:
{
  "summary": "2-3句话的摘要",
  "key_topics": ["话题1", "话题2"],
  "mood": "happy/sad/anxious/calm/neutral/mixed"
}

注意：
- 只总结用户说的内容，不要总结 AI 的回复
- 摘要要简洁有信息量，不要废话
- 只输出 JSON，不要有其他文字`;

// ── Preferred cheap models for summarization ──

const CHEAP_MODEL_ORDER = [
  'gpt-4o-mini',
  'glm-4-flash',
  'deepseek-v3.2',
  'qwen3-max',
  'gpt-5.2',
  'claude-sonnet-4-6',
];

// ── Valid moods ──

const VALID_MOODS = new Set(['happy', 'sad', 'anxious', 'calm', 'neutral', 'mixed']);

// ── Public API ──

export interface SummaryResult {
  summary: string;
  keyTopics: string[];
  mood: string;
}

/**
 * Generate a session summary from conversation messages.
 * Prefers cheap models to minimize cost. Returns null if summarization fails.
 */
export async function summarizeSession(
  messages: ChatMessage[],
  selectedModel: string,
  apiKeys: Record<string, string>,
): Promise<SummaryResult | null> {
  // Try the user's selected model first, then fall back to cheap models
  const modelInfo = getModelInfo(selectedModel);

  // Skip Manus (no standard chat endpoint)
  if (modelInfo && modelInfo.provider !== 'manus') {
    const apiKey = apiKeys[modelInfo.apiKeyField];
    if (apiKey) {
      const result = await attemptSummarize(messages, modelInfo, apiKey);
      if (result) return result;
    }
  }

  // Fallback: try cheap models in order
  for (const modelId of CHEAP_MODEL_ORDER) {
    if (modelId === selectedModel) continue; // already tried
    const info = getModelInfo(modelId);
    if (!info) continue;
    const key = apiKeys[info.apiKeyField];
    if (!key) continue;

    const result = await attemptSummarize(messages, info, key);
    if (result) return result;
  }

  return null;
}

// ── Internal helpers ──

async function attemptSummarize(
  messages: ChatMessage[],
  modelInfo: { provider: string; apiModelId: string },
  apiKey: string,
): Promise<SummaryResult | null> {
  // Take last 30 messages max
  const recent = messages.slice(-30);
  const conversationText = recent
    .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${textOf(m.content)}`)
    .join('\n\n');

  const userMessage: ChatMessage[] = [
    { role: 'user', content: `请总结以下对话:\n\n${conversationText}` },
  ];

  let result = '';

  try {
    if (modelInfo.provider === 'anthropic') {
      await streamAnthropicChat(
        apiKey,
        modelInfo.apiModelId,
        SUMMARY_SYSTEM_PROMPT,
        userMessage,
        {
          onToken: (token) => { result += token; },
          onComplete: (full) => { result = full; },
          onError: () => {},
        },
      );
    } else {
      const baseUrl = PROVIDER_BASE_URLS[modelInfo.provider as keyof typeof PROVIDER_BASE_URLS];
      await streamOpenAICompatibleChat(
        baseUrl,
        apiKey,
        modelInfo.apiModelId,
        SUMMARY_SYSTEM_PROMPT,
        userMessage,
        {
          onToken: (token) => { result += token; },
          onComplete: (full) => { result = full; },
          onError: () => {},
        },
      );
    }

    return parseSummaryResult(result);
  } catch {
    return null;
  }
}

function parseSummaryResult(text: string): SummaryResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || typeof parsed.summary !== 'string' || parsed.summary.length === 0) {
      return null;
    }

    return {
      summary: parsed.summary.slice(0, 500), // Cap at 500 chars
      keyTopics: Array.isArray(parsed.key_topics)
        ? parsed.key_topics.filter((t: any) => typeof t === 'string').slice(0, 5)
        : [],
      mood: VALID_MOODS.has(parsed.mood) ? parsed.mood : 'neutral',
    };
  } catch {
    return null;
  }
}
