import { streamOpenAICompatibleChat } from './openaiCompatibleClient';
import { streamAnthropicChat } from './anthropicClient';
import { getModelInfo, PROVIDER_BASE_URLS } from './models';
import { textOf } from './contentUtils';
import type { ChatMessage, MessageContent } from './types';
import type { CoreProfile, ProfileCategory, EmotionTag } from '../../types/memory';

// ── Extraction result types ──

export interface MemoryOperation {
  action: 'INSERT' | 'UPDATE' | 'SKIP';
  entityKey: string;
  category?: ProfileCategory | 'event';
  title?: string;
  content?: string;
  emotion?: EmotionTag;
  importance?: number;
  reason?: string;
}

export interface ExtractionResult {
  profileUpdates: MemoryOperation[];
  episodes: MemoryOperation[];
}

/** Structured result with status for caller feedback */
export type ExtractionStatus =
  | { status: 'success'; result: ExtractionResult }
  | { status: 'no_info' }        // AI determined no valuable info
  | { status: 'skipped'; reason: string }  // Skipped (no model, no key, etc.)
  | { status: 'error'; error: string };    // API or parse error

// ── High-value content patterns for smart triggering ──

const HIGH_VALUE_PATTERNS = [
  // Names/relationships (might be discussing important people)
  /叫|名字|朋友|女朋友|男朋友|老婆|老公|爸|妈|儿子|女儿|同事|老板/,
  // Major life events
  /离职|辞职|裁员|分手|结婚|怀孕|搬家|生病|住院|毕业|入职|破产|赚了|亏了/,
  // Emotional expression
  /好开心|好难过|好焦虑|好烦|崩溃|抑郁|失眠|压力|孤独|想念|害怕|后悔/,
  // Self-awareness
  /我觉得我|我发现自己|我意识到|我一直|我其实|我本来|我以前|我现在/,
  // Preference expression
  /我喜欢|我讨厌|我不喜欢|我习惯|我倾向|我更想|我宁愿/,
  // Identity info
  /我(叫|是|在|住|来自|今年)/,
  // English equivalents
  /\b(my name|i am|i'm|i have|i work|i live|i like|i hate|i feel)\b/i,
];

/**
 * Check if recent messages contain image attachments.
 * Image messages are automatically considered high-value for memory extraction.
 */
function hasImageInRecentMessages(
  messages: { role: string; content: string; imageAttachments?: unknown[] }[],
  fromIndex: number,
): boolean {
  const newMessages = messages.slice(fromIndex);
  return newMessages.some((m) => m.role === 'user' && m.imageAttachments && m.imageAttachments.length > 0);
}

/**
 * Smart trigger: decides whether to run extraction based on content quality + timing.
 *
 * @param messages       All messages in the session
 * @param lastExtractionIndex  Index after last extraction
 * @param lastExtractionTime   Timestamp of last extraction (ms)
 */
export function shouldExtractMemory(
  messages: { role: string; content: string; imageAttachments?: unknown[] }[],
  lastExtractionIndex: number,
  lastExtractionTime: number = 0,
): boolean {
  const now = Date.now();
  const MIN_INTERVAL = 60_000;   // At least 1 minute between extractions
  const MAX_INTERVAL = 300_000;  // Force extraction after 5 minutes of active chat

  // Hard minimum interval to avoid API spam
  if (lastExtractionTime > 0 && now - lastExtractionTime < MIN_INTERVAL) return false;

  const newMessages = messages.slice(lastExtractionIndex);
  const userMessages = newMessages.filter((m) => m.role === 'user');

  // At least 2 new user messages before considering
  if (userMessages.length < 2) return false;

  // Image messages are automatically high-value → trigger extraction
  if (hasImageInRecentMessages(messages, lastExtractionIndex) && userMessages.length >= 2) {
    return true;
  }

  // Check for high-value content in the latest user message
  const latestUserMsg = userMessages[userMessages.length - 1]?.content || '';
  const isHighValue = HIGH_VALUE_PATTERNS.some((p) => p.test(latestUserMsg));

  // High-value content detected → trigger if past minimum interval
  if (isHighValue && userMessages.length >= 2) return true;

  // Force extraction at 8+ user messages regardless of quality
  if (userMessages.length >= 8) return true;

  // Time-based fallback: if chatting for 5+ minutes, force extraction
  if (lastExtractionTime > 0 && now - lastExtractionTime >= MAX_INTERVAL && userMessages.length >= 3) {
    return true;
  }

  // Quality-based scoring for non-high-value messages
  const totalScore = userMessages.reduce(
    (sum, m) => sum + scoreMessageQuality(m.content), 0,
  );

  // Medium quality: score >= 4 with 3+ messages
  if (totalScore >= 4 && userMessages.length >= 3) return true;

  // Low quality: need 5+ messages with any score > 0
  if (totalScore > 0 && userMessages.length >= 5) return true;

  return false;
}

/**
 * Score a single message for information density (0–10 scale).
 */
function scoreMessageQuality(content: string): number {
  let score = 0;
  const len = content.length;

  if (len < 5) return 0;
  if (len >= 20) score += 1;
  if (len >= 80) score += 1;

  if (/我(叫|是|在|住|来自|今年)/.test(content)) score += 3;
  if (/他|她|我(男|女)?(朋友|同事|家人|爸|妈|哥|姐|弟|妹|老公|老婆|对象|老板)/.test(content)) score += 2;
  if (/我(喜欢|讨厌|害怕|想要|希望|不想|不喜欢|受不了|最爱)/.test(content)) score += 2;
  if (/最近|今天|昨天|上周|上个月|刚刚|前几天|去年/.test(content)) score += 2;
  if (/心情|感觉|觉得|烦|开心|难过|焦虑|崩溃|压力|失眠|哭|生气|委屈|孤独|迷茫/.test(content)) score += 2;
  if (/工作|公司|项目|学校|上班|加班|面试|跳槽|辞职|考试/.test(content)) score += 1;
  if (/\b(my|i am|i'm|i have|i work|i live|i like|i hate|i feel|i think|recently|today|yesterday)\b/i.test(content)) score += 2;

  return Math.min(10, score);
}

// ── Extraction prompt builder ──

function buildExtractionPrompt(existingProfiles: CoreProfile[]): string {
  let existingContext = '（暂无已有记忆）';
  if (existingProfiles.length > 0) {
    existingContext = existingProfiles
      .map((p) => `[key: ${p.key}] (${p.category}) ${p.title}: ${p.content}`)
      .join('\n');
  }

  return `你是 Hollow 的记忆管理系统。你的任务是从对话中提取值得长期记忆的信息，并与已有记忆进行比对。

## 已有记忆
${existingContext}

## 任务
1. 从对话中识别值得记忆的信息
2. 与已有记忆比对，判断每条信息是新增还是更新
3. 按以下 JSON 格式输出

## 输出格式（严格 JSON，不要有其他文字）
{
  "has_valuable_info": true,
  "operations": [
    {
      "action": "INSERT",
      "entity_key": "唯一英文标识（小写下划线，如 an_an, pet_momo, career）",
      "category": "identity/relationship/preference/trait/event",
      "title": "显示标题（中文，简洁）",
      "content": "完整内容（中文，一段话，包含所有已知信息）",
      "emotion": "happy/sad/anxious/angry/excited/calm/frustrated/hopeful/neutral",
      "importance": 3
    },
    {
      "action": "UPDATE",
      "entity_key": "要更新的已有记忆的 key",
      "content": "合并后的完整内容（保留旧信息 + 补充新信息）",
      "reason": "简述更新原因"
    },
    {
      "action": "SKIP",
      "entity_key": "已有记忆的 key",
      "reason": "为什么跳过"
    }
  ]
}

## Category 定义
- identity: 姓名、年龄、性别、城市、职业、教育等客观身份信息
- relationship: 重要的人或动物（家人、朋友、伴侣、宠物），包括关系描述和互动细节
- preference: 兴趣爱好、饮食偏好、沟通风格偏好、审美偏好等
- trait: 性格特征、价值观、行为模式、心理特点、自我认知的变化
- event: 具体的事件或经历（有时间性，会衰减）

## 关键规则
1. 同一个实体（人/宠物/事物）只能有一个 entity_key，所有相关信息合并到一条记录中
2. 如果新信息是对已有记忆的补充，使用 UPDATE 而不是 INSERT
3. 如果新信息与已有记忆完全重复，使用 SKIP
4. UPDATE 时，content 必须是合并后的完整版本，不是增量
5. 不要提取无意义的信息（如"用户说了你好"、"用户回复了嗯"）
6. event 类型的记忆要包含具体的时间和情绪
7. 每个 relationship 类型的记忆应该以人/动物的名字作为 entity_key
8. 不要提取 AI 说的话，只提取用户透露的信息
9. importance 范围 1-5，5 为最重要
10. 只输出 JSON，不要有其他文字
11. 如果对话中用户发送了图片且 AI 描述了图片内容，提取图片中的关键信息作为记忆（如图片中的人→relationship，地点/场景→event，物品/宠物→preference 或 relationship）。只保存文字描述，不保存图片本身`;
}

// ── Main extraction function ──

export async function extractMemories(
  messages: ChatMessage[],
  existingProfiles: CoreProfile[],
  selectedModel: string,
  apiKeys: Record<string, string>,
): Promise<ExtractionStatus> {
  const modelInfo = getModelInfo(selectedModel);
  if (!modelInfo) return { status: 'skipped', reason: 'unknown_model' };

  // Manus doesn't support /chat/completions — fall back
  if (modelInfo.provider === 'manus') {
    const fallbackOrder = ['gpt-4o-mini', 'gpt-5.2', 'claude-sonnet-4-6', 'deepseek-v3.2', 'glm-4-flash'];
    for (const fbId of fallbackOrder) {
      const fbInfo = getModelInfo(fbId);
      if (fbInfo && apiKeys[fbInfo.apiKeyField]) {
        return extractWithModel(messages, existingProfiles, fbInfo, apiKeys[fbInfo.apiKeyField]);
      }
    }
    return { status: 'skipped', reason: 'no_fallback_key' };
  }

  const apiKey = apiKeys[modelInfo.apiKeyField];
  if (!apiKey) return { status: 'skipped', reason: 'no_api_key' };

  return extractWithModel(messages, existingProfiles, modelInfo, apiKey);
}

async function extractWithModel(
  messages: ChatMessage[],
  existingProfiles: CoreProfile[],
  modelInfo: { provider: string; apiModelId: string },
  apiKey: string,
): Promise<ExtractionStatus> {
  const recentMessages = messages.slice(-10);
  // Extract plain text from each message (multimodal → text only for extraction)
  const conversationText = recentMessages
    .map((m) => {
      const text = textOf(m.content);
      return `${m.role === 'user' ? '用户' : 'AI'}: ${text}`;
    })
    .join('\n\n');

  const extractionMessages: ChatMessage[] = [
    { role: 'user', content: `请从以下对话中提取记忆:\n\n${conversationText}` },
  ];

  const systemPrompt = buildExtractionPrompt(existingProfiles);
  let result = '';
  let apiErrorMsg: string | null = null;

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
          onError: (err) => { apiErrorMsg = err.message; },
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
          onError: (err) => { apiErrorMsg = err.message; },
        },
      );
    }

    if (apiErrorMsg) {
      return { status: 'error', error: apiErrorMsg };
    }

    const parsed = parseExtractionResult(result);
    if (!parsed) return { status: 'no_info' };
    return { status: 'success', result: parsed };
  } catch (e) {
    return { status: 'error', error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Parse AI output ──

const VALID_CATEGORIES = ['identity', 'relationship', 'preference', 'trait', 'event'] as const;
const VALID_EMOTIONS: EmotionTag[] = ['happy', 'sad', 'anxious', 'angry', 'excited', 'calm', 'frustrated', 'hopeful', 'neutral'];

function parseExtractionResult(text: string): ExtractionResult | null {
  try {
    // Find the JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || parsed.has_valuable_info === false) return null;

    const operations: MemoryOperation[] = (parsed.operations || [])
      .filter((item: any) =>
        item &&
        typeof item.entity_key === 'string' &&
        item.entity_key.length > 0 &&
        ['INSERT', 'UPDATE', 'SKIP'].includes(item.action),
      )
      .map((item: any) => ({
        action: item.action as 'INSERT' | 'UPDATE' | 'SKIP',
        entityKey: item.entity_key.toLowerCase().replace(/\s+/g, '_'),
        category: VALID_CATEGORIES.includes(item.category) ? item.category : undefined,
        title: item.title || undefined,
        content: item.content || undefined,
        emotion: VALID_EMOTIONS.includes(item.emotion) ? item.emotion : undefined,
        importance: item.importance ? Math.max(1, Math.min(5, Number(item.importance))) : undefined,
        reason: item.reason || undefined,
      }));

    // Separate profiles vs events
    const profileUpdates = operations.filter(
      (op) => op.action !== 'SKIP' && op.category !== 'event',
    );
    const episodes = operations.filter(
      (op) => op.action !== 'SKIP' && op.category === 'event',
    );

    if (profileUpdates.length === 0 && episodes.length === 0) return null;

    return { profileUpdates, episodes };
  } catch {
    return null;
  }
}
