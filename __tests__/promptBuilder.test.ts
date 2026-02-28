import { buildSystemPrompt } from '../src/services/ai/promptBuilder';

describe('buildSystemPrompt', () => {
  it('should build Chinese prompt for zh locale', () => {
    const prompt = buildSystemPrompt('测试', 'empathetic', 50, '', 'zh');
    expect(prompt).toContain('留白');
    expect(prompt).toContain('测试');
    expect(prompt).toContain('安静地接住'); // empathetic signature
  });

  it('should build English prompt for en locale', () => {
    const prompt = buildSystemPrompt('TestUser', 'analytical', 50, '', 'en');
    expect(prompt).toContain('Hollow');
    expect(prompt).toContain('TestUser');
    expect(prompt).toContain('whiteboard'); // analytical persona
  });

  it('should include memory context when provided', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 50, 'Likes coffee', 'en');
    expect(prompt).toContain('Likes coffee');
    expect(prompt).toContain('What You Know About User');
  });

  it('should not include memory section when memoryContext is empty', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 50, '', 'en');
    expect(prompt).not.toContain('What You Know About');
  });

  it('should handle concise response style', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 10, '', 'en');
    expect(prompt).toContain('Minimal replies');
  });

  it('should handle elaborate response style', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 90, '', 'en');
    expect(prompt).toContain('In-depth replies');
  });

  it('should include absolute rules', () => {
    const prompt = buildSystemPrompt('User', 'empathetic', 50, '', 'en');
    expect(prompt).toContain('Absolute Rules');
    expect(prompt).toContain('Response Priority');
  });

  it('should include safety boundaries', () => {
    const prompt = buildSystemPrompt('User', 'empathetic', 50, '', 'zh');
    expect(prompt).toContain('安全边界');
    expect(prompt).toContain('400-161-9995');
  });

  it('should include psychology frameworks', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 50, '', 'en');
    expect(prompt).toContain('Implicit Psychology Frameworks');
    expect(prompt).toContain('Cognitive reframing');
  });

  it('should include length mirroring rule', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 50, '', 'zh');
    expect(prompt).toContain('长度镜像规则');
  });
});
