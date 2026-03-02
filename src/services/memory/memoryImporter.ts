import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import type { ProfileCategory, EmotionTag } from '../../types/memory';
import { getModelInfo, PROVIDER_BASE_URLS } from '../ai/models';
import { apiFetch } from '../ai/apiFetch';
import { logError } from '../../utils/errorLogger';

// ============================================
// Security: input sanitization
// ============================================

/** Maximum file size: 500 KB of UTF-8 text */
const MAX_FILE_SIZE = 512_000;
/** Maximum entries to import per category */
const MAX_PROFILES = 200;
const MAX_EPISODES = 500;
/** Maximum length of a single field value */
const MAX_FIELD_LENGTH = 2000;

/**
 * Strip dangerous content from imported text:
 * - HTML/script/style/iframe tags (XSS vectors)
 * - JavaScript: / data: / vbscript: URI schemes (all variations)
 * - On-event attributes (onerror, onclick, etc.)
 * - Expression() CSS attacks
 * - Null bytes and other control characters
 * - Unicode homoglyphs of dangerous characters
 */
function sanitizeText(text: string): string {
  return text
    // Remove null bytes and non-printable control chars (keep newlines, tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip <script>…</script>, <style>…</style>, <iframe>…</iframe> blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    // Strip all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove URI schemes (with optional whitespace/encoding bypasses)
    .replace(/j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi, '')
    .replace(/v\s*b\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi, '')
    .replace(/data\s*:[^\s]*?(;base64)?\s*,/gi, '')
    // Remove on-event handlers (onerror=, onclick=, onload=, etc.)
    .replace(/\bon\w+\s*=/gi, '')
    // Remove CSS expression() attacks
    .replace(/expression\s*\(/gi, '')
    // Remove url() references in any remaining CSS-like content
    .replace(/url\s*\(\s*['"]?\s*javascript/gi, '')
    // Strip HTML entity-encoded angle brackets that bypass tag removal
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/<[^>]*>/g, '')
    // Remove HTML entity-encoded javascript
    .replace(/&#[\dxa-f]+;/gi, '');
}

/** Truncate a field value to MAX_FIELD_LENGTH */
function truncateField(value: string): string {
  return value.length > MAX_FIELD_LENGTH ? value.slice(0, MAX_FIELD_LENGTH) : value;
}

/**
 * Validate file content before parsing.
 * Returns sanitized content or throws with a user-friendly message.
 */
export function validateFileContent(content: string): string {
  if (!content || typeof content !== 'string') {
    throw new Error('IMPORT_EMPTY_FILE');
  }
  if (content.length > MAX_FILE_SIZE) {
    throw new Error('IMPORT_FILE_TOO_LARGE');
  }
  // Sanitize the entire input
  return sanitizeText(content);
}

// ============================================
// File picking
// ============================================

export async function pickMarkdownFile(): Promise<string | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/markdown', 'text/plain', 'text/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    const asset = result.assets[0];

    // Pre-validate file size if available
    if (asset.size && asset.size > MAX_FILE_SIZE) {
      throw new Error('IMPORT_FILE_TOO_LARGE');
    }

    const fileUri = asset.uri;
    const content = await readAsStringAsync(fileUri, {
      encoding: EncodingType.UTF8,
    });

    // Validate and sanitize
    return validateFileContent(content);
  } catch (error) {
    // Re-throw known import errors for the UI to handle
    if (error instanceof Error && error.message.startsWith('IMPORT_')) {
      throw error;
    }
    logError('import', 'pickFile')(error);
    return null;
  }
}

// ============================================
// Detect Hollow export format
// ============================================

export function isHollowExportFormat(content: string): boolean {
  return content.includes('由 Hollow 导出于') && content.includes('## 核心画像');
}

// ============================================
// Deterministic parsing (Hollow export format)
// ============================================

export function parseHollowExport(content: string): {
  profiles: Array<{ key: string; category: ProfileCategory; title: string; content: string }>;
  episodes: Array<{ content: string; emotion: EmotionTag; intensity: number; eventDate: string }>;
} {
  const profiles: Array<{ key: string; category: ProfileCategory; title: string; content: string }> = [];
  const episodes: Array<{ content: string; emotion: EmotionTag; intensity: number; eventDate: string }> = [];

  // Sanitize input before parsing
  const sanitized = sanitizeText(content);
  const lines = sanitized.split('\n');
  let currentSection: 'profile' | 'episode' | 'summary' | null = null;
  let currentCategory: ProfileCategory = 'identity';
  let currentDate = '';

  const CATEGORY_REVERSE: Record<string, ProfileCategory> = {
    '身份信息': 'identity',
    '人际关系': 'relationship',
    '偏好习惯': 'preference',
    '性格特征': 'trait',
  };

  const EMOTION_REVERSE: Record<string, EmotionTag> = {
    '开心': 'happy', '难过': 'sad', '焦虑': 'anxious',
    '生气': 'angry', '兴奋': 'excited', '平静': 'calm',
    '沮丧': 'frustrated', '期待': 'hopeful',
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section headers
    if (trimmed === '## 核心画像') { currentSection = 'profile'; continue; }
    if (trimmed === '## 情境记忆') { currentSection = 'episode'; continue; }
    if (trimmed === '## 对话摘要') { currentSection = 'summary'; continue; }
    if (trimmed === '## 导入说明') { currentSection = null; continue; }

    if (currentSection === 'profile' && profiles.length < MAX_PROFILES) {
      // Sub-category heading: ### 身份信息
      const catMatch = trimmed.match(/^### (.+)$/);
      if (catMatch) {
        currentCategory = CATEGORY_REVERSE[catMatch[1]] || 'identity';
        continue;
      }
      // Item: - **title** <!-- key:xxx -->: content  (new format with embedded key)
      // or:   - **title**: content                    (legacy format without key)
      const itemWithKey = trimmed.match(/^- \*\*(.+?)\*\*\s*<!--\s*key:(.+?)\s*-->:\s*(.+)$/);
      const itemLegacy = !itemWithKey ? trimmed.match(/^- \*\*(.+?)\*\*:\s*(.+)$/) : null;
      if (itemWithKey) {
        const title = truncateField(itemWithKey[1]);
        const embeddedKey = itemWithKey[2].trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fff]/g, '');
        profiles.push({
          key: embeddedKey || `profile_${profiles.length}`,
          category: currentCategory,
          title,
          content: truncateField(itemWithKey[3]),
        });
      } else if (itemLegacy) {
        const title = truncateField(itemLegacy[1]);
        const key = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fff]/g, '');
        profiles.push({
          key: key || `profile_${profiles.length}`,
          category: currentCategory,
          title,
          content: truncateField(itemLegacy[2]),
        });
      }
    }

    if (currentSection === 'episode' && episodes.length < MAX_EPISODES) {
      // Date heading: ### 2026-03-01
      const dateMatch = trimmed.match(/^### (\d{4}-\d{2}-\d{2})$/);
      if (dateMatch) {
        currentDate = dateMatch[1];
        continue;
      }
      // Item: - content — *emotion* ●●●○○
      const epMatch = trimmed.match(/^- (.+?) — \*(.+?)\*\s*(●+○*)$/);
      if (epMatch) {
        const emotionCn = epMatch[2];
        const intensityDots = epMatch[3];
        const intensity = (intensityDots.match(/●/g) || []).length;
        episodes.push({
          content: truncateField(epMatch[1]),
          emotion: EMOTION_REVERSE[emotionCn] || 'neutral',
          intensity: intensity || 3,
          eventDate: currentDate || new Date().toISOString().split('T')[0],
        });
      }
    }
    // Session summaries are not imported (they regenerate from conversations)
  }

  return { profiles, episodes };
}

// ============================================
// AI parsing prompt for arbitrary text
// ============================================

export function buildImportParsingPrompt(textContent: string): string {
  // Sanitize then truncate to prevent token explosion and XSS
  const sanitized = sanitizeText(textContent);
  const truncated = sanitized.length > 8000
    ? sanitized.slice(0, 8000) + '\n\n[内容已截断...]'
    : sanitized;

  return `你是 Hollow 的记忆解析系统。用户导入了一份个人文档，请从中提取结构化的记忆信息。

## 用户文档内容
\`\`\`
${truncated}
\`\`\`

## 任务
从文档中提取两类信息：

1. **核心画像 (profiles)**: 稳定的、长期有效的用户信息
   - identity: 姓名、年龄、性别、所在城市、职业等
   - relationship: 重要的人（家人、朋友、伴侣、宠物等）
   - preference: 兴趣爱好、饮食偏好、沟通风格等
   - trait: 性格特征、价值观、行为模式等

2. **情境事件 (episodes)**: 具体的事件或经历
   - 包含时间、事件描述、相关情绪

## 输出格式（严格 JSON，不要有其他文字）
{
  "profiles": [
    {
      "key": "唯一英文标识（小写下划线，如 name, pet_momo, lives_in_singapore）",
      "category": "identity/relationship/preference/trait",
      "title": "显示标题（中文）",
      "content": "详细内容（中文）"
    }
  ],
  "episodes": [
    {
      "content": "事件描述（一句话）",
      "emotion": "happy/sad/anxious/angry/excited/calm/frustrated/hopeful/neutral",
      "intensity": 1-5,
      "event_date": "YYYY-MM-DD 或 unknown"
    }
  ]
}

## 规则
1. 只提取文档中明确提到的信息，不要推测
2. 每个 profile 的 key 必须唯一且有意义
3. 如果文档内容太少或没有有价值的信息，返回空数组
4. 优先提取 profiles，episodes 次之
5. 只输出 JSON`;
}

// ============================================
// Parse AI response
// ============================================

export interface ImportResult {
  profiles: Array<{
    key: string;
    category: ProfileCategory;
    title: string;
    content: string;
  }>;
  episodes: Array<{
    content: string;
    emotion: EmotionTag;
    intensity: number;
    eventDate: string;
  }>;
}

export function parseAIImportResponse(response: string): ImportResult | null {
  try {
    // Extract JSON block — guard against huge payloads
    const sanitizedResponse = response.length > 100_000
      ? response.slice(0, 100_000)
      : response;
    const jsonMatch = sanitizedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate top-level structure
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (!Array.isArray(parsed.profiles) && !Array.isArray(parsed.episodes)) return null;

    const validCategories = ['identity', 'relationship', 'preference', 'trait'];
    const validEmotions = ['happy', 'sad', 'anxious', 'angry', 'excited', 'calm', 'frustrated', 'hopeful', 'neutral'];

    const profiles = (Array.isArray(parsed.profiles) ? parsed.profiles : [])
      .slice(0, MAX_PROFILES)
      .map((p: any) => ({
        key: sanitizeText(String(p.key || '')).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fff]/g, ''),
        category: (validCategories.includes(p.category) ? p.category : 'identity') as ProfileCategory,
        title: truncateField(sanitizeText(String(p.title || ''))),
        content: truncateField(sanitizeText(String(p.content || ''))),
      }))
      .filter((p: any) => p.key && p.title && p.content);

    const episodes = (Array.isArray(parsed.episodes) ? parsed.episodes : [])
      .slice(0, MAX_EPISODES)
      .map((e: any) => {
        const rawDate = String(e.event_date || e.eventDate || '');
        // Validate date format (YYYY-MM-DD) or fallback to today
        const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
          ? rawDate
          : new Date().toISOString().split('T')[0];
        return {
          content: truncateField(sanitizeText(String(e.content || ''))),
          emotion: (validEmotions.includes(e.emotion) ? e.emotion : 'neutral') as EmotionTag,
          intensity: Math.min(5, Math.max(1, Number(e.intensity) || 3)),
          eventDate: dateStr,
        };
      })
      .filter((e: any) => e.content);

    return { profiles, episodes };
  } catch (error) {
    logError('import', 'parseAIResponse')(error);
    return null;
  }
}

// ============================================
// Non-streaming AI call for import parsing
// ============================================

// Cheap models preferred for parsing
const IMPORT_MODEL_PREFERENCE = [
  'gpt-4o-mini',
  'deepseek-v3.2',
  'glm-4-flash',
  'qwen3-max',
  'gpt-5.2',
  'claude-sonnet-4-6',
];

export async function callAIForImport(
  prompt: string,
  settings: { selectedModel: string; apiKeys: Record<string, string> },
): Promise<string> {
  // Find an available model (prefer cheap ones)
  let modelId = settings.selectedModel;
  for (const candidate of IMPORT_MODEL_PREFERENCE) {
    const info = getModelInfo(candidate);
    if (info && settings.apiKeys[info.apiKeyField]) {
      modelId = candidate;
      break;
    }
  }

  const modelInfo = getModelInfo(modelId);
  if (!modelInfo) throw new Error('No model available');

  const apiKey = settings.apiKeys[modelInfo.apiKeyField];
  if (!apiKey) throw new Error('API key not set');

  const messages = [{ role: 'user' as const, content: prompt }];

  if (modelInfo.provider === 'anthropic') {
    // Anthropic API
    const response = await apiFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelInfo.apiModelId,
        max_tokens: 4096,
        messages,
      }),
    });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return data.content?.[0]?.text ?? '';
  }

  // OpenAI-compatible API
  const baseUrl = PROVIDER_BASE_URLS[modelInfo.provider];
  const response = await apiFetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelInfo.apiModelId,
      max_tokens: 4096,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}
