import { buildSystemPrompt } from '../src/services/ai/promptBuilder';

describe('buildSystemPrompt', () => {
  it('should build Chinese prompt for zh locale', () => {
    const prompt = buildSystemPrompt('测试', 'empathetic', 50, '', 'zh');
    expect(prompt).toContain('留白');
    expect(prompt).toContain('测试');
    expect(prompt).toContain('温暖共情');
  });

  it('should build English prompt for en locale', () => {
    const prompt = buildSystemPrompt('TestUser', 'analytical', 50, '', 'en');
    expect(prompt).toContain('Hollow');
    expect(prompt).toContain('TestUser');
    expect(prompt).toContain('Rational & Analytical');
  });

  it('should include memory context when provided', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 50, 'Likes coffee', 'en');
    expect(prompt).toContain('Likes coffee');
    expect(prompt).toContain('MEMORY INTEGRATION');
  });

  it('should not include specific memories when memoryContext is empty', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 50, '', 'en');
    expect(prompt).not.toContain('What you know about User');
  });

  it('should handle concise response style', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 10, '', 'en');
    expect(prompt).toContain('Brief');
  });

  it('should handle elaborate response style', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 90, '', 'en');
    expect(prompt).toContain('In-depth');
  });

  it('should include absolute prohibitions', () => {
    const prompt = buildSystemPrompt('User', 'empathetic', 50, '', 'en');
    expect(prompt).toContain('ABSOLUTE PROHIBITIONS');
    expect(prompt).toContain('RESPONSE PRIORITY');
  });

  it('should include safety boundaries', () => {
    const prompt = buildSystemPrompt('User', 'empathetic', 50, '', 'zh');
    expect(prompt).toContain('安全边界');
    expect(prompt).toContain('400-161-9995');
  });
});
