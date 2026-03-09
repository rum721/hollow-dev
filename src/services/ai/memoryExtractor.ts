import { streamOpenAICompatibleChat } from './openaiCompatibleClient';
import { streamAnthropicChat } from './anthropicClient';
import { getModelInfo, PROVIDER_BASE_URLS } from './models';
import { getDefaultBuiltInModel } from './builtInModels';
import { getNetworkEnvironment } from './networkDetector';
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

// ── Entity key normalization ──────────────────────────────────────────
// Known entity aliases: maps various AI-generated keys to canonical form.
// This prevents duplicates like 安安/an_an, 小黑猫墨墨/pet_momo.

const ENTITY_KEY_ALIASES: Record<string, string> = {
  // People
  '安安': 'an_an',
  'an_an': 'an_an',
  'anan': 'an_an',
  '心动的女生': 'an_an',
  '正在了解的女生': 'an_an',
  '生病的朋友': 'an_an',
  'relationship_care_value': 'an_an',
  'communication_style': 'an_an',
  // Pets
  '墨墨': 'pet_momo',
  'momo': 'pet_momo',
  '小黑猫墨墨': 'pet_momo',
  'pet_momo': 'pet_momo',
  '小猫的名字': 'pet_momo',
  '粽子': 'pet_zongzi',
  'zongzi': 'pet_zongzi',
  'pet_zongzi': 'pet_zongzi',
  // Identity
  '用户身份': 'user_identity',
  '用户基本信息': 'user_identity',
  'user_identity': 'user_identity',
  // Career
  '用户职业经历': 'career_history',
  'career_history': 'career_history',
  // Financial
  '用户资产状况': 'financial_status',
  '用户资产状况补充': 'financial_status',
  'financial_status': 'financial_status',
  // AI Product
  '正在开发的AI产品': 'ai_product_hollow',
  'product_ai_memory': 'ai_product_hollow',
  'ai_product_hollow': 'ai_product_hollow',
  // AI Tool
  '小龙虾和manus': 'ai_tool_preference',
  'ai_tool_preference': 'ai_tool_preference',
  // Conversation Style
  'AI对话风格偏好': 'ai_conversation_style',
  'ai对话风格偏好': 'ai_conversation_style',
  'ai_tone_feedback': 'ai_conversation_style',
  'ai_conversation_style': 'ai_conversation_style',
  // Personality
  '用户自我认知': 'personality_introvert',
  'personality_introvert': 'personality_introvert',
  // Emotional Growth
  '感情态度': 'emotional_growth',
  '感情中的行为模式': 'emotional_growth',
  '对爱的认知': 'emotional_growth',
  'emotional_growth': 'emotional_growth',
  // Expression Style
  '表达欲的提升': 'expression_style',
  '倾向与ai交流内心感受': 'expression_style',
  '社交习惯': 'expression_style',
  '输出自我的变化': 'expression_style',
  'expression_style': 'expression_style',
};

/** Simple string hash for fallback key generation. */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Normalize an entity key from AI output to a canonical English snake_case form.
 * 1. Exact alias match
 * 2. Fuzzy alias match (substring containment)
 * 3. Already valid English key → pass through
 * 4. Strip non-English chars
 * 5. Hash-based fallback
 */
export function normalizeEntityKey(rawKey: string): string {
  const trimmed = rawKey.trim().toLowerCase();

  // 1. Exact alias match
  if (ENTITY_KEY_ALIASES[rawKey]) return ENTITY_KEY_ALIASES[rawKey];
  if (ENTITY_KEY_ALIASES[trimmed]) return ENTITY_KEY_ALIASES[trimmed];

  // 2. Fuzzy match: check if rawKey contains or is contained by a known alias
  for (const [alias, canonical] of Object.entries(ENTITY_KEY_ALIASES)) {
    if (rawKey.includes(alias) || alias.includes(rawKey)) {
      return canonical;
    }
  }

  // 3. Already a valid English snake_case key → return as-is
  if (/^[a-z][a-z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }

  // 4. Try to extract the English part
  const englishPart = trimmed
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (englishPart.length >= 3) return englishPart;

  // 5. Hash-based fallback for pure-Chinese keys
  return `mem_${hashCode(rawKey).toString(36)}`;
}

/**
 * Clean content of raw metadata prefixes that leak from prompt context.
 * Strips patterns like: [key: xxx] (category) title: ...
 */
export function cleanContent(content: string): string {
  return content
    .replace(/^\[key:\s*[^\]]*\]\s*\([^)]*\)\s*[^:]*:\s*/i, '')
    .replace(/^\[key:\s*[^\]]*\]\s*/i, '')
    .trim();
}

/**
 * Strip year references from memory content.
 * The system provides event_date separately, so content should be time-independent.
 *
 * Handles:
 * - "2025年3月" → "3月"
 * - "2025年10月15日" → "10月15日"
 * - "2025年" (standalone) → ""
 * - "今年"/"去年"/"前年"/"明年" → ""
 * - "in 2025" / "since 2024" → ""
 */
export function stripYearFromContent(content: string): string {
  return content
    // "2024年3月15日" → "3月15日", "2025年10月" → "10月"
    .replace(/20\d{2}年(\d{1,2}月)/g, '$1')
    // Standalone "2025年" (with optional trailing space/comma)
    .replace(/20\d{2}年[，,]?\s*/g, '')
    // Chinese relative time words
    .replace(/[今去前明]年[，,]?\s*/g, '')
    // English patterns: "in 2025", "since 2024", "(2025)"
    .replace(/\b(in|since|from|around|circa)\s+20\d{2}\b/gi, '')
    .replace(/\(20\d{2}\)/g, '')
    // Standalone year numbers that look like years (surrounded by spaces/punctuation)
    .replace(/(?<=^|[\s,，。.;；])(20\d{2})(?=[\s,，。.;；]|$)/g, '')
    // Clean up multiple spaces and leading/trailing whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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
  // Format existing memories WITHOUT copyable metadata prefixes.
  // Use a clean tabular format so the AI sees entity_key but doesn't copy it into content.
  let existingContext = '（暂无已有记忆）';
  if (existingProfiles.length > 0) {
    existingContext = existingProfiles
      .map((p) => `- entity_key=${p.key} | ${p.category} | ${p.title}: ${cleanContent(p.content)}`)
      .join('\n');
  }

  // Inject current date — model must NOT guess the year
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  return `你是 Hollow 的记忆管理系统。从对话中提取值得长期记忆的信息，并与已有记忆比对，决定新增、更新或跳过。

## 当前时间
今天是 ${today}（${currentYear}年）。

## 已有记忆
${existingContext}

## 最近对话
（见用户消息）

## 输出格式（严格 JSON，不要有任何其他文字）
{
  "has_valuable_info": true,
  "operations": [
    {
      "action": "INSERT",
      "entity_key": "英文小写下划线标识符",
      "category": "identity|relationship|preference|trait|event",
      "title": "简洁中文标题",
      "content": "完整描述，一段话，包含所有已知信息",
      "emotion": "happy/sad/anxious/angry/excited/calm/frustrated/hopeful/neutral",
      "importance": 3
    },
    {
      "action": "UPDATE",
      "entity_key": "已有记忆的 entity_key",
      "content": "合并旧信息+新信息后的完整描述",
      "reason": "简述更新原因"
    },
    {
      "action": "SKIP",
      "reason": "为什么没有新信息值得提取"
    }
  ]
}

## Category 定义
- identity: 姓名、年龄、性别、城市、职业、教育、资产等客观身份信息
- relationship: 重要的人或动物（家人、朋友、伴侣、宠物），以实体名字为中心，一个人/动物一条记录
- preference: 兴趣爱好、饮食偏好、沟通风格偏好、审美偏好
- trait: 性格特征、价值观、行为模式、心理特点、自我认知变化
- event: 具体事件或经历（有时间性）

## entity_key 命名规则（极其重要，必须严格遵守）
1. 必须是英文小写 + 下划线，如 an_an, pet_momo, career_history
2. 人名用拼音：安安→an_an, 墨墨→momo, 粽子→zongzi
3. 宠物加 pet_ 前缀：pet_momo, pet_zongzi
4. 同一个实体永远用同一个 key，不要创建新 key
5. 参考已有记忆中的 entity_key，优先复用而不是新建
6. 绝对不要用中文作为 entity_key

## 合并规则
1. 关于同一个人/动物的所有信息必须合并到一条记录（如安安的关系进展、沟通风格、家庭背景、生病状况，全部合并到 entity_key=an_an 这一条）
2. UPDATE 时 content 必须是合并后的完整版本，包含旧信息+新信息，不是增量
3. 如果对话中没有新的有价值信息，只输出一个 SKIP 操作
4. 不要提取无意义的信息（如"用户说了你好"、"用户表示同意"）
5. event 类型每条应该是独立的、有时间标记的具体事件
6. event 类型：同一天内关于同一主题的事件应合并为一条
7. 不要提取 AI 说的话，只提取用户透露的信息
8. content 字段只写纯描述文字，不要包含 entity_key、category、标签等元数据
9. importance 评分标准：5=人生重大转折，4=重要情感/关系进展，3=日常有价值信息，2=普通记录，1=不该提取
10. 如果对话中用户发送了图片且 AI 描述了图片内容，提取图片中的关键信息作为记忆

## 时间规则（极其重要，必须严格遵守）
1. content 中【绝对禁止】出现具体年份数字（如"2025年"、"2026年"、"2024年"）
2. content 中【绝对禁止】出现"今年"、"去年"、"前年"、"明年"等相对时间词
3. content 中可以保留月份和日期（如"3月"、"10月15日"），但不能写年份
4. event_date 字段由系统自动提供，你不需要输出 event_date
5. 时间描述请用无年份的方式表达

正确示例:
- ✅ "和安安一起去看了画展，她表现得很开心"
- ✅ "3月开始在新公司工作，负责AI产品"
- ✅ "最近在考虑跳槽，对当前工作不太满意"
- ✅ "春天时养了一只小猫叫墨墨"

错误示例:
- ❌ "2025年3月和安安一起看展"（包含年份）
- ❌ "今年开始在新公司工作"（包含"今年"）
- ❌ "去年养了一只猫"（包含"去年"）
- ❌ "2026年春天开始减肥"（包含年份）

只输出 JSON，不要有任何其他文字。`;
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
  if (!apiKey) {
    // 用户没有配置 API Key，使用内置模型进行记忆提取
    try {
      const networkEnv = await getNetworkEnvironment();
      const builtIn = getDefaultBuiltInModel(networkEnv);
      return extractWithModel(
        messages, existingProfiles,
        { provider: builtIn.provider, apiModelId: builtIn.apiModelId },
        builtIn.apiKey,
        builtIn.baseUrl,
      );
    } catch {
      return { status: 'skipped', reason: 'builtin_failed' };
    }
  }

  return extractWithModel(messages, existingProfiles, modelInfo, apiKey);
}

async function extractWithModel(
  messages: ChatMessage[],
  existingProfiles: CoreProfile[],
  modelInfo: { provider: string; apiModelId: string },
  apiKey: string,
  baseUrlOverride?: string,
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
      const baseUrl = baseUrlOverride || PROVIDER_BASE_URLS[modelInfo.provider as keyof typeof PROVIDER_BASE_URLS];
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

/** Map old/wrong category names to canonical V2 categories. */
function normalizeCategoryName(cat: string | undefined): string | undefined {
  if (!cat) return undefined;
  const MAP: Record<string, string> = {
    'people': 'relationship',
    'events': 'event',
    'emotions': 'trait',
    'preferences': 'preference',
  };
  return MAP[cat] || (VALID_CATEGORIES.includes(cat as any) ? cat : undefined);
}

function parseExtractionResult(text: string): ExtractionResult | null {
  try {
    // Find the JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || parsed.has_valuable_info === false) return null;

    const operations: MemoryOperation[] = (parsed.operations || [])
      .filter((item: any) => {
        if (!item || !item.action) return false;
        if (item.action === 'SKIP') return true;
        if (item.action === 'INSERT') {
          return item.entity_key && item.category && item.title && item.content;
        }
        if (item.action === 'UPDATE') {
          return item.entity_key && item.content;
        }
        return false;
      })
      .map((item: any) => ({
        action: item.action as 'INSERT' | 'UPDATE' | 'SKIP',
        // Apply normalizeEntityKey to force consistent key format
        entityKey: item.entity_key ? normalizeEntityKey(item.entity_key) : '',
        category: normalizeCategoryName(item.category) as ProfileCategory | 'event' | undefined,
        title: item.title || undefined,
        // Apply cleanContent to strip any metadata prefixes from AI output
        content: item.content ? cleanContent(item.content) : undefined,
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
