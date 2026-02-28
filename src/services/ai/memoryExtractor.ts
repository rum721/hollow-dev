import { streamOpenAICompatibleChat } from './openaiCompatibleClient';
import { streamAnthropicChat } from './anthropicClient';
import { getModelInfo, PROVIDER_BASE_URLS } from './models';
import type { ChatMessage } from './types';
import type { MemoryCategory } from '../../types/memory';

const EXTRACTION_PROMPT = `你是一个记忆管理助手。请从以下对话中提取值得长期记忆的关键信息，
并严格按以下 JSON 格式输出。每个条目必须包含 category, title, content 三个字段。

有效的 category 值: "people", "events", "emotions", "preferences"

输出格式（JSON 数组）:
[
  {"category": "people", "title": "人物名称", "content": "关系和关键信息"},
  {"category": "events", "title": "事件简述", "content": "详细描述"},
  {"category": "emotions", "title": "情绪触发", "content": "情绪反应和应对方式"},
  {"category": "preferences", "title": "偏好类别", "content": "具体偏好内容"}
]

规则:
- 只提取新的、有价值的信息
- 如果没有值得记忆的内容，返回空数组 []
- 只输出 JSON，不要有其他文字`;

interface ExtractedMemory {
  category: MemoryCategory;
  title: string;
  content: string;
}

export async function extractMemories(
  messages: ChatMessage[],
  selectedModel: string,
  apiKeys: Record<string, string>,
): Promise<ExtractedMemory[]> {
  const modelInfo = getModelInfo(selectedModel);
  if (!modelInfo) return [];

  // Skip memory extraction for task-based providers (Manus)
  // They don't support /chat/completions and would waste credits
  if (modelInfo.provider === 'manus') return [];

  const apiKey = apiKeys[modelInfo.apiKeyField];
  if (!apiKey) return [];

  // Build a condensed conversation for extraction
  const recentMessages = messages.slice(-10);
  const conversationText = recentMessages
    .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
    .join('\n\n');

  const extractionMessages: ChatMessage[] = [
    { role: 'user', content: `请从以下对话中提取记忆:\n\n${conversationText}` },
  ];

  let result = '';

  try {
    if (modelInfo.provider === 'anthropic') {
      await streamAnthropicChat(
        apiKey,
        modelInfo.apiModelId,
        EXTRACTION_PROMPT,
        extractionMessages,
        {
          onToken: (token) => { result += token; },
          onComplete: (full) => { result = full; },
          onError: () => {},
        },
      );
    } else {
      const baseUrl = PROVIDER_BASE_URLS[modelInfo.provider];
      await streamOpenAICompatibleChat(
        baseUrl,
        apiKey,
        modelInfo.apiModelId,
        EXTRACTION_PROMPT,
        extractionMessages,
        {
          onToken: (token) => { result += token; },
          onComplete: (full) => { result = full; },
          onError: () => {},
        },
      );
    }

    return parseExtractionResult(result);
  } catch {
    return [];
  }
}

function parseExtractionResult(text: string): ExtractedMemory[] {
  try {
    // Try to find JSON array in the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    const validCategories: MemoryCategory[] = ['people', 'events', 'emotions', 'preferences'];

    return parsed.filter(
      (item: any) =>
        item &&
        typeof item.category === 'string' &&
        validCategories.includes(item.category) &&
        typeof item.title === 'string' &&
        typeof item.content === 'string' &&
        item.title.length > 0 &&
        item.content.length > 0,
    ) as ExtractedMemory[];
  } catch {
    return [];
  }
}
