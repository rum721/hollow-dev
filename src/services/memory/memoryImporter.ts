import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import type { ProfileCategory, EmotionTag } from '../../types/memory';
import { getModelInfo, PROVIDER_BASE_URLS } from '../ai/models';
import { apiFetch } from '../ai/apiFetch';

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

    const fileUri = result.assets[0].uri;
    const content = await readAsStringAsync(fileUri, {
      encoding: EncodingType.UTF8,
    });

    return content;
  } catch (error) {
    console.error('Failed to pick file:', error);
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

  const lines = content.split('\n');
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

    if (currentSection === 'profile') {
      // Sub-category heading: ### 身份信息
      const catMatch = trimmed.match(/^### (.+)$/);
      if (catMatch) {
        currentCategory = CATEGORY_REVERSE[catMatch[1]] || 'identity';
        continue;
      }
      // Item: - **title**: content
      const itemMatch = trimmed.match(/^- \*\*(.+?)\*\*:\s*(.+)$/);
      if (itemMatch) {
        const title = itemMatch[1];
        const key = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fff]/g, '');
        profiles.push({
          key: key || `profile_${profiles.length}`,
          category: currentCategory,
          title,
          content: itemMatch[2],
        });
      }
    }

    if (currentSection === 'episode') {
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
          content: epMatch[1],
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
  // Truncate to prevent token explosion
  const truncated = textContent.length > 8000
    ? textContent.slice(0, 8000) + '\n\n[内容已截断...]'
    : textContent;

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
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    const validCategories = ['identity', 'relationship', 'preference', 'trait'];
    const validEmotions = ['happy', 'sad', 'anxious', 'angry', 'excited', 'calm', 'frustrated', 'hopeful', 'neutral'];

    const profiles = (parsed.profiles || []).map((p: any) => ({
      key: String(p.key || '').toLowerCase().replace(/\s+/g, '_'),
      category: (validCategories.includes(p.category) ? p.category : 'identity') as ProfileCategory,
      title: String(p.title || ''),
      content: String(p.content || ''),
    })).filter((p: any) => p.key && p.title && p.content);

    const episodes = (parsed.episodes || []).map((e: any) => ({
      content: String(e.content || ''),
      emotion: (validEmotions.includes(e.emotion) ? e.emotion : 'neutral') as EmotionTag,
      intensity: Math.min(5, Math.max(1, Number(e.intensity) || 3)),
      eventDate: String(e.event_date || e.eventDate || new Date().toISOString().split('T')[0]),
    })).filter((e: any) => e.content);

    return { profiles, episodes };
  } catch {
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
