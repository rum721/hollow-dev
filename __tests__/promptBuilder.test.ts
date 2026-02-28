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

  it('should include safety boundaries (lightweight, no specific hotline numbers)', () => {
    const prompt = buildSystemPrompt('User', 'empathetic', 50, '', 'zh');
    expect(prompt).toContain('安全边界');
    expect(prompt).toContain('心理危机热线');
    expect(prompt).not.toContain('400-161-9995'); // no specific numbers
  });

  it('should include English safety boundaries without specific numbers', () => {
    const prompt = buildSystemPrompt('User', 'empathetic', 50, '', 'en');
    expect(prompt).toContain('Safety Boundaries');
    expect(prompt).toContain('crisis hotline');
    expect(prompt).not.toContain('988'); // no specific numbers
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

  // ── Knowledge context integration tests ────────────────────────────

  it('should inject knowledge context between psychology and safety (zh)', () => {
    const knowledge = '### 测试知识内容\n\n这是测试知识。';
    const prompt = buildSystemPrompt('User', 'balanced', 50, '', 'zh', knowledge);
    expect(prompt).toContain('测试知识内容');
    // Knowledge should be between psychology and safety
    const psychologyIdx = prompt.indexOf('隐式心理学框架');
    const knowledgeIdx = prompt.indexOf('测试知识内容');
    const safetyIdx = prompt.indexOf('安全边界');
    expect(psychologyIdx).toBeLessThan(knowledgeIdx);
    expect(knowledgeIdx).toBeLessThan(safetyIdx);
  });

  it('should inject knowledge context between psychology and safety (en)', () => {
    const knowledge = '### Test Knowledge Content\n\nThis is test knowledge.';
    const prompt = buildSystemPrompt('User', 'balanced', 50, '', 'en', knowledge);
    expect(prompt).toContain('Test Knowledge Content');
    // Knowledge should be between psychology and safety
    const psychologyIdx = prompt.indexOf('Implicit Psychology Frameworks');
    const knowledgeIdx = prompt.indexOf('Test Knowledge Content');
    const safetyIdx = prompt.indexOf('Safety Boundaries');
    expect(psychologyIdx).toBeLessThan(knowledgeIdx);
    expect(knowledgeIdx).toBeLessThan(safetyIdx);
  });

  it('should not inject extra content when knowledgeContext is undefined', () => {
    const prompt = buildSystemPrompt('User', 'balanced', 50, '', 'en');
    // Safety should follow directly after psychology (with no topic knowledge in between)
    expect(prompt).not.toContain('Deep Knowledge Relevant to Current Topic');
  });
});
