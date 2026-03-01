/**
 * Premium tier intelligent model router.
 *
 * Routes conversations between GPT-5.2 and Claude Sonnet based on the
 * emotional vs analytical nature of the user's latest message.
 *
 * Default split: 70% GPT / 30% Claude (when no clear signal is detected).
 * Emotional content  -> prefer Claude (better empathy / nuance)
 * Analytical content -> prefer GPT   (better structured reasoning)
 */

// ── English keyword sets ────────────────────────────────────────────

const EMOTIONAL_KEYWORDS_EN = new Set([
  'sad', 'anxious', 'lonely', 'stressed', 'depressed', 'angry', 'scared',
  'worried', 'frustrated', 'overwhelmed', 'hurt', 'grief', 'crying',
  'heartbroken', 'insomnia', 'panic', 'afraid', 'hopeless', 'lost',
  'exhausted', 'empty', 'numb', 'miss', 'regret', 'guilt', 'shame',
]);

const ANALYTICAL_KEYWORDS_EN = new Set([
  'decide', 'compare', 'plan', 'analyze', 'choose', 'evaluate', 'think',
  'organize', 'strategy', 'pros', 'cons', 'options', 'advice', 'suggest',
  'recommend', 'budget', 'career', 'goal', 'objective', 'timeline',
  'priority', 'framework', 'structure', 'logic', 'reason',
]);

// ── Chinese keyword sets ────────────────────────────────────────────

const EMOTIONAL_KEYWORDS_ZH = new Set([
  '难过', '焦虑', '孤独', '压力', '伤心', '害怕', '失眠', '烦躁',
  '痛苦', '无助', '崩溃', '抑郁', '生气', '愤怒', '担心', '恐惧',
  '心烦', '委屈', '绝望', '想哭', '思念', '后悔', '内疚', '羞耻',
  '疲惫', '空虚', '麻木', '心痛', '不安', '迷茫',
]);

const ANALYTICAL_KEYWORDS_ZH = new Set([
  '决定', '比较', '计划', '分析', '选择', '评估', '思考', '整理',
  '规划', '建议', '推荐', '预算', '职业', '目标', '优先', '框架',
  '逻辑', '理性', '方案', '策略', '利弊', '优缺点', '时间线',
]);

// ── Model IDs used by the router ────────────────────────────────────

const CLAUDE_MODEL_ID = 'claude-sonnet-4-6';
const GPT_MODEL_ID = 'gpt-5.2';

// ── Public API ──────────────────────────────────────────────────────

/**
 * Analyse the last user message and return the model ID that should
 * handle the request for a Premium-tier user.
 *
 * Scoring rules:
 *   1. Each matched emotional keyword  -> +1 emotional score
 *   2. Each matched analytical keyword -> +1 analytical score
 *   3. If emotionalScore > analyticalScore (and > 0) -> Claude
 *   4. If analyticalScore > emotionalScore (and > 0) -> GPT
 *   5. Tie or no keywords -> random 70/30 GPT/Claude split
 */
export function getPremiumModelId(lastUserMessage: string): string {
  const text = lastUserMessage.toLowerCase();

  let emotionalScore = 0;
  let analyticalScore = 0;

  // --- English: split on common punctuation / whitespace and match whole words ---
  const words = text.split(/[\s,.\-!?;:'"()\u3000\u3001\u3002\uff0c\uff01\uff1f]+/);
  for (const word of words) {
    if (EMOTIONAL_KEYWORDS_EN.has(word)) emotionalScore++;
    if (ANALYTICAL_KEYWORDS_EN.has(word)) analyticalScore++;
  }

  // --- Chinese: substring match (Chinese has no word boundaries) ---
  for (const kw of EMOTIONAL_KEYWORDS_ZH) {
    if (text.includes(kw)) emotionalScore++;
  }
  for (const kw of ANALYTICAL_KEYWORDS_ZH) {
    if (text.includes(kw)) analyticalScore++;
  }

  // --- Decision ---
  if (emotionalScore > analyticalScore && emotionalScore > 0) {
    return CLAUDE_MODEL_ID;
  }

  if (analyticalScore > emotionalScore && analyticalScore > 0) {
    return GPT_MODEL_ID;
  }

  // Default: 70 % GPT / 30 % Claude
  return Math.random() < 0.7 ? GPT_MODEL_ID : CLAUDE_MODEL_ID;
}
