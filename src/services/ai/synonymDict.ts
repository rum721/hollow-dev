/**
 * Local synonym dictionary for semantic expansion in memory retrieval.
 * Zero API cost — runs entirely on-device.
 */

const EMOTION_SYNONYMS: Record<string, string[]> = {
  '开心': ['高兴', '快乐', '兴奋', '激动', '愉快', '欣喜', '满足', '幸福'],
  '难过': ['伤心', '悲伤', '失落', '沮丧', '心痛', '委屈', '心碎'],
  '焦虑': ['紧张', '担心', '不安', '压力', '烦躁', '忧虑', '恐慌'],
  '生气': ['愤怒', '恼火', '气愤', '不满', '烦'],
  '累': ['疲惫', '疲倦', '精疲力竭', '身心俱疲', '心累'],
  '孤独': ['寂寞', '孤单', '落寞', '一个人'],
  '害怕': ['恐惧', '担忧', '不安', '惶恐'],
};

const RELATION_SYNONYMS: Record<string, string[]> = {
  '女朋友': ['女友', '对象', '那个女生', '她'],
  '男朋友': ['男友', '对象', '那个男生', '他'],
  '猫': ['猫咪', '喵', '小猫'],
  '狗': ['狗狗', '汪', '小狗'],
  '工作': ['上班', '公司', '项目', '业务', '办公'],
  '学校': ['学习', '上学', '课程', '考试'],
  '家': ['家里', '回家', '家人'],
  '朋友': ['闺蜜', '哥们', '兄弟', '死党'],
};

/**
 * Expand a list of keywords with their synonyms.
 * Input: ['焦虑', '工作']
 * Output: ['焦虑', '紧张', '担心', '不安', '压力', '烦躁', '忧虑', '恐慌', '工作', '上班', '公司', '项目', '业务', '办公']
 */
export function expandWithSynonyms(keywords: string[]): string[] {
  const expanded = new Set(keywords);
  const allDicts = { ...EMOTION_SYNONYMS, ...RELATION_SYNONYMS };

  for (const kw of keywords) {
    for (const [key, synonyms] of Object.entries(allDicts)) {
      if (kw.includes(key) || synonyms.some((s) => kw.includes(s))) {
        expanded.add(key);
        synonyms.forEach((s) => expanded.add(s));
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Extract meaningful keywords from messages, filtering stop words.
 */
export function extractKeywords(messages: string[]): string[] {
  const chineseStopWords = new Set(
    '的,了,是,在,我,你,他,她,它,们,个,和,与,也,都,就,不,有,这,那,要,会,可以,很,吧,呢,啊,吗,把,被,让,用,去,来,过,还,又,再,只,给,对,跟,从,到'.split(','),
  );

  const keywords: string[] = [];
  for (const msg of messages.slice(-3)) {
    const tokens = msg
      .toLowerCase()
      .split(/[\s,，。！？、；：""''（）《》\[\]{}·~!@#$%^&*()+=|\\/<>?;:'"]+/);
    for (const token of tokens) {
      const trimmed = token.trim();
      if (trimmed.length > 0 && !chineseStopWords.has(trimmed)) {
        keywords.push(trimmed);
      }
    }
  }
  return keywords;
}

/**
 * Emotion display labels (Chinese).
 */
export const EMOTION_LABELS: Record<string, string> = {
  happy: '开心',
  sad: '难过',
  anxious: '焦虑',
  angry: '生气',
  excited: '兴奋',
  calm: '平静',
  frustrated: '沮丧',
  hopeful: '期待',
  neutral: '',
  mixed: '复杂',
};
