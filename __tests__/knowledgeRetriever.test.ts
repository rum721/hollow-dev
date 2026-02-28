import { getRelevantKnowledge } from '../src/services/knowledge/knowledgeRetriever';
import { CORE_KNOWLEDGE } from '../src/services/knowledge/knowledgeBase';

describe('getRelevantKnowledge', () => {
  // ── Core knowledge always included ─────────────────────────────────

  it('should always include core knowledge for zh', () => {
    const result = getRelevantKnowledge([], 'zh');
    expect(result).toContain('认知重构');
    expect(result).toContain('内在部分');
    expect(result).toContain('依恋模式');
  });

  it('should always include core knowledge for en', () => {
    const result = getRelevantKnowledge([], 'en');
    expect(result).toContain('Cognitive Reframing');
    expect(result).toContain('Internal Parts');
    expect(result).toContain('Attachment Patterns');
  });

  it('should return only core knowledge when no keywords match', () => {
    const result = getRelevantKnowledge(['hello how are you today'], 'en');
    expect(result).toContain('Cognitive Reframing');
    expect(result).not.toContain('Deep Knowledge Relevant to Current Topic');
  });

  // ── Topic matching ─────────────────────────────────────────────────

  it('should match MBTI keywords (en)', () => {
    const result = getRelevantKnowledge(['I just found out I am an INFP'], 'en');
    expect(result).toContain('Deep Knowledge Relevant to Current Topic');
    expect(result).toContain('MBTI');
    expect(result).toContain('Enneagram');
  });

  it('should match MBTI keywords (zh)', () => {
    const result = getRelevantKnowledge(['我的MBTI是INTJ'], 'zh');
    expect(result).toContain('与当前话题相关的深度知识');
    expect(result).toContain('MBTI');
  });

  it('should match zodiac keywords', () => {
    const result = getRelevantKnowledge(['I am a scorpio rising'], 'en');
    expect(result).toContain('Zodiac Archetypes');
  });

  it('should match astrology transit keywords (zh)', () => {
    const result = getRelevantKnowledge(['最近水逆好烦'], 'zh');
    expect(result).toContain('行运与逆行');
  });

  it('should match eastern metaphysics keywords', () => {
    const result = getRelevantKnowledge(['I want to know about my bazi'], 'en');
    expect(result).toContain('Eastern Metaphysics');
  });

  it('should match social behavioral keywords', () => {
    const result = getRelevantKnowledge(['I keep falling into sunk cost thinking'], 'en');
    expect(result).toContain('Social Psychology');
  });

  it('should match holistic healing keywords', () => {
    const result = getRelevantKnowledge(['I want to try meditation and mindfulness'], 'en');
    expect(result).toContain('Holistic Healing');
  });

  it('should match human design keywords', () => {
    const result = getRelevantKnowledge(['我是投射者类型'], 'zh');
    expect(result).toContain('人类设计');
  });

  // ── Max topics limit ───────────────────────────────────────────────

  it('should limit to max 2 topics even when multiple match', () => {
    // This message contains keywords from MBTI, zodiac, and meditation topics
    const result = getRelevantKnowledge(
      ['I am an INFP scorpio who loves meditation and astrology'],
      'en',
    );
    // Count how many topic headers appear (the core knowledge has none of these headers)
    const topicSections = result.split('Deep Knowledge Relevant to Current Topic');
    // Should only have 1 occurrence of this header (meaning max 2 topics)
    expect(topicSections.length).toBe(2); // 1 split = 2 parts
  });

  // ── Case insensitivity ─────────────────────────────────────────────

  it('should match keywords case-insensitively', () => {
    const result = getRelevantKnowledge(['i am an infp personality type'], 'en');
    expect(result).toContain('MBTI');
  });

  // ── Multiple messages scanned ──────────────────────────────────────

  it('should scan across multiple user messages', () => {
    const result = getRelevantKnowledge(
      ['Hi there', 'I wonder about my zodiac sign', 'Am I a typical virgo?'],
      'en',
    );
    expect(result).toContain('Zodiac Archetypes');
  });
});
