import { streamOpenAICompatibleChat } from './openaiCompatibleClient';
import { streamAnthropicChat } from './anthropicClient';
import { getModelInfo, PROVIDER_BASE_URLS } from './models';
import type { ChatMessage } from './types';
import type { CoreProfile, ProfileCategory, EmotionTag } from '../../types/memory';

// ── Extraction result types ──

export interface ProfileUpdate {
  action: 'new' | 'update';
  key: string;
  updateKey?: string;
  category: ProfileCategory;
  title: string;
  content: string;
}

export interface EpisodeExtract {
  content: string;
  emotion: EmotionTag;
  intensity: number;
}

export interface ExtractionResult {
  profileUpdates: ProfileUpdate[];
  episodes: EpisodeExtract[];
}

// ── Smart trigger logic ──

export function shouldExtractMemory(
  messages: { role: string; content: string }[],
  lastExtractionIndex: number,
): boolean {
  const newMessages = messages.slice(lastExtractionIndex);
  const userMessages = newMessages.filter((m) => m.role === 'user');

  // At least 3 new user messages
  if (userMessages.length < 3) return false;

  // Force extraction at 8+ user messages
  if (userMessages.length >= 8) return true;

  // Check for high-info-density signal words
  const signalPatterns = [
    /我(叫|是|在|住|喜欢|讨厌|害怕)/,
    /最近|今天|昨天|上周/,
    /他|她|我(男|女)?(朋友|同事|家人|爸|妈|哥|姐)/,
    /心情|感觉|觉得|烦|开心|难过|焦虑/,
    /工作|公司|项目|学校/,
  ];

  const hasSignal = userMessages.some((m) =>
    signalPatterns.some((p) => p.test(m.content)),
  );

  return userMessages.length >= 5 || hasSignal;
}

// ── Extraction prompt builder ──

function buildExtractionPrompt(existingProfiles: CoreProfile[]): string {
  let profileContext = '';
  if (existingProfiles.length > 0) {
    profileContext = '\n## 当前已知的用户画像\n';
    existingProfiles.forEach((p) => {
      profileContext += `- [${p.key}] ${p.title}: ${p.content}\n`;
    });
  }

  return `你是 Hollow 的记忆管理系统。请分析对话并提取有价值的信息。
${profileContext}
## 输出格式（严格 JSON，不要有其他文字）
{
  "has_valuable_info": true,
  "profile_updates": [
    {
      "action": "new 或 update",
      "key": "唯一英文标识（小写下划线，如 pet_momo, work_crypto_fund）",
      "update_key": "如果 action 是 update，填写要更新的已有画像的 key",
      "category": "identity/relationship/preference/trait",
      "title": "显示标题",
      "content": "详细内容"
    }
  ],
  "episodes": [
    {
      "content": "具体事件描述（一句话）",
      "emotion": "happy/sad/anxious/angry/excited/calm/frustrated/hopeful/neutral",
      "intensity": 1-5
    }
  ]
}

## 规则
1. 如果对话只是闲聊没有新信息，设 has_valuable_info 为 false，其他数组为空
2. profile_updates 只提取稳定的、长期有效的信息（身份、关系、偏好、性格）
3. 如果新信息与已有画像冲突或补充，用 "update" action 并指明 update_key
4. episodes 只提取具体的事件或强烈的情绪体验
5. 不要提取 AI 说的话，只提取用户透露的信息
6. key 必须是英文小写+下划线，具有唯一性和可读性
7. 只输出 JSON，不要有其他文字`;
}

// ── Main extraction function ──

export async function extractMemories(
  messages: ChatMessage[],
  existingProfiles: CoreProfile[],
  selectedModel: string,
  apiKeys: Record<string, string>,
): Promise<ExtractionResult | null> {
  const modelInfo = getModelInfo(selectedModel);
  if (!modelInfo) return null;

  // Manus doesn't support /chat/completions — fall back
  if (modelInfo.provider === 'manus') {
    const fallbackOrder = ['gpt-4o-mini', 'gpt-5.2', 'claude-sonnet-4-6', 'deepseek-v3.2', 'glm-4-flash'];
    for (const fbId of fallbackOrder) {
      const fbInfo = getModelInfo(fbId);
      if (fbInfo && apiKeys[fbInfo.apiKeyField]) {
        return extractWithModel(messages, existingProfiles, fbInfo, apiKeys[fbInfo.apiKeyField]);
      }
    }
    return null;
  }

  const apiKey = apiKeys[modelInfo.apiKeyField];
  if (!apiKey) return null;

  return extractWithModel(messages, existingProfiles, modelInfo, apiKey);
}

async function extractWithModel(
  messages: ChatMessage[],
  existingProfiles: CoreProfile[],
  modelInfo: { provider: string; apiModelId: string },
  apiKey: string,
): Promise<ExtractionResult | null> {
  const recentMessages = messages.slice(-10);
  const conversationText = recentMessages
    .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
    .join('\n\n');

  const extractionMessages: ChatMessage[] = [
    { role: 'user', content: `请从以下对话中提取记忆:\n\n${conversationText}` },
  ];

  const systemPrompt = buildExtractionPrompt(existingProfiles);
  let result = '';

  try {
    if (modelInfo.provider === 'anthropic') {
      await streamAnthropicChat(
        apiKey,
        modelInfo.apiModelId,
        systemPrompt,
        extractionMessages,
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
        systemPrompt,
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
    return null;
  }
}

// ── Parse AI output ──

const VALID_CATEGORIES: ProfileCategory[] = ['identity', 'relationship', 'preference', 'trait'];
const VALID_EMOTIONS: EmotionTag[] = ['happy', 'sad', 'anxious', 'angry', 'excited', 'calm', 'frustrated', 'hopeful', 'neutral'];

function parseExtractionResult(text: string): ExtractionResult | null {
  try {
    // Find the JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || parsed.has_valuable_info === false) return null;

    const profileUpdates: ProfileUpdate[] = (parsed.profile_updates || [])
      .filter((item: any) =>
        item &&
        typeof item.key === 'string' &&
        item.key.length > 0 &&
        VALID_CATEGORIES.includes(item.category) &&
        typeof item.title === 'string' &&
        typeof item.content === 'string',
      )
      .map((item: any) => ({
        action: item.action === 'update' ? 'update' : 'new',
        key: item.key.toLowerCase().replace(/\s+/g, '_'),
        updateKey: item.update_key || undefined,
        category: item.category as ProfileCategory,
        title: item.title,
        content: item.content,
      }));

    const episodes: EpisodeExtract[] = (parsed.episodes || [])
      .filter((item: any) =>
        item &&
        typeof item.content === 'string' &&
        item.content.length > 0,
      )
      .map((item: any) => ({
        content: item.content,
        emotion: VALID_EMOTIONS.includes(item.emotion) ? item.emotion : 'neutral',
        intensity: Math.max(1, Math.min(5, Number(item.intensity) || 3)),
      }));

    if (profileUpdates.length === 0 && episodes.length === 0) return null;

    return { profileUpdates, episodes };
  } catch {
    return null;
  }
}
