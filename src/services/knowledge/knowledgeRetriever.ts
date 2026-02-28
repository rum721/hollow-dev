import { CORE_KNOWLEDGE, TOPIC_KNOWLEDGE } from './knowledgeBase';

const MAX_TOPICS = 2; // Max triggered topics per query, to avoid prompt bloat

/**
 * Returns relevant knowledge context for the current conversation.
 *
 * 1. CORE_KNOWLEDGE is always included (~2,000 tokens).
 * 2. Recent user messages are scanned for keyword matches.
 * 3. Up to MAX_TOPICS matched topics are appended (~1,000-2,000 tokens each).
 *
 * @param userMessages - Last 3 user messages (most recent conversation context)
 * @param locale - 'zh' | 'en'
 * @returns Formatted knowledge string ready for System Prompt injection
 */
export function getRelevantKnowledge(
  userMessages: string[],
  locale: string,
): string {
  const isZh = locale === 'zh';
  const lang: 'zh' | 'en' = isZh ? 'zh' : 'en';

  // 1. Core knowledge is always included
  let knowledge = CORE_KNOWLEDGE[lang];

  // 2. Scan user messages for topic keyword matches
  const combinedText = userMessages.join(' ').toLowerCase();
  const matchedTopics: typeof TOPIC_KNOWLEDGE = [];

  for (const topic of TOPIC_KNOWLEDGE) {
    const keywords = topic.keywords[lang];
    const matched = keywords.some((kw) => combinedText.includes(kw.toLowerCase()));
    if (matched) {
      matchedTopics.push(topic);
      if (matchedTopics.length >= MAX_TOPICS) break;
    }
  }

  // 3. Append matched topic knowledge
  if (matchedTopics.length > 0) {
    knowledge += '\n\n---\n\n';
    knowledge += isZh
      ? '### 与当前话题相关的深度知识\n\n'
      : '### Deep Knowledge Relevant to Current Topic\n\n';
    for (const topic of matchedTopics) {
      knowledge += topic.content[lang] + '\n\n';
    }
  }

  return knowledge;
}
