import { getPremiumModelId } from '../src/services/ai/premiumRouter';

describe('getPremiumModelId', () => {
  it('should route emotional English messages to Claude', () => {
    const model = getPremiumModelId('I feel so sad and lonely today');
    expect(model).toBe('claude-sonnet-4-6');
  });

  it('should route emotional Chinese messages to Claude', () => {
    const model = getPremiumModelId('今天很焦虑，感觉很孤独');
    expect(model).toBe('claude-sonnet-4-6');
  });

  it('should route analytical English messages to GPT', () => {
    const model = getPremiumModelId('Help me compare these options and decide');
    expect(model).toBe('gpt-4o');
  });

  it('should route analytical Chinese messages to GPT', () => {
    const model = getPremiumModelId('帮我分析一下这几个选择的利弊');
    expect(model).toBe('gpt-4o');
  });

  it('should return valid model for neutral messages', () => {
    const model = getPremiumModelId('Hello, how are you?');
    expect(['gpt-4o', 'claude-sonnet-4-6']).toContain(model);
  });
});
