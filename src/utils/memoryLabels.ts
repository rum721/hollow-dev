/**
 * Humanize entity_key values for display.
 * Maps internal keys like "pet_momo" → "墨墨", "user_identity" → "关于我".
 */

const KEY_MAP: Record<string, string> = {
  user_identity: '关于我',
  financial_status: '经济状况',
  career_history: '工作经历',
  ai_product_hollow: '关于留白',
  personality_introvert: '性格内向',
  emotional_growth: '情绪成长',
  expression_style: '表达方式',
  ai_tool_preference: 'AI 工具偏好',
  ai_conversation_style: '对话风格',
};

/**
 * Convert an entity_key to a human-readable label.
 * Falls back to simple formatting if no mapping exists.
 */
export function humanizeKey(key: string): string {
  if (KEY_MAP[key]) return KEY_MAP[key];

  // Convert snake_case to readable: "pet_momo" → "Momo", "work_bytedance" → "Bytedance"
  const parts = key.split('_');
  // Drop common prefixes
  const prefixes = ['pet', 'friend', 'family', 'work', 'hobby', 'food', 'place'];
  if (parts.length > 1 && prefixes.includes(parts[0])) {
    return parts.slice(1).map(capitalize).join(' ');
  }

  return parts.map(capitalize).join(' ');
}

function capitalize(s: string): string {
  if (!s) return s;
  // Don't capitalize Chinese characters
  if (/[\u4e00-\u9fff]/.test(s[0])) return s;
  return s[0].toUpperCase() + s.slice(1);
}
