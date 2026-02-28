import { buildSystemPrompt } from '../src/services/ai/promptBuilder';

describe('buildSystemPrompt', () => {
  it('should build Chinese prompt for zh locale', () => {
    const prompt = buildSystemPrompt('测试', 'empathetic', 50, '', 'zh');
    expect(prompt).toContain('留白');
    expect(prompt).toContain('测试');
    expect(prompt).toContain('温暖模式');
  });

  it('should build English prompt for en locale', () => {
    const prompt = buildSystemPrompt('TestUser', 'analytical', 50, '', 'en');
    expect(prompt).toContain('Hollow');
    expect(prompt).toContain('TestUser');
    expect(prompt).toContain('Rational mode');
  });

  it('should include memory context when provided', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 50, 'Likes coffee', 'en');
    expect(prompt).toContain('Likes coffee');
    expect(prompt).toContain('Memory Context');
  });

  it('should not include memory section when empty', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 50, '', 'en');
    expect(prompt).not.toContain('Memory Context');
  });

  it('should handle concise response style', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 10, '', 'en');
    expect(prompt).toContain('brief');
  });

  it('should handle elaborate response style', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 90, '', 'en');
    expect(prompt).toContain('detailed');
  });
});
