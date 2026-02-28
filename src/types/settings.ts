import type { Locale } from '../i18n';

export type ConversationStyle = 'empathetic' | 'analytical' | 'balanced';

export type ModelId = string;

export type ModelProvider =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'zhipu'
  | 'minimax'
  | 'deepseek'
  | 'qwen'
  | 'moonshot'
  | 'baichuan'
  | 'yi'
  | 'stepfun'
  | 'doubao'
  | 'spark'
  | 'manus';

export type LanguageSetting = Locale | 'auto';

export interface ModelInfo {
  id: ModelId;
  label: string;
  provider: ModelProvider;
  apiModelId: string;
  apiKeyField: string;
}

export type AutoDestructDays = 7 | 30 | 90 | null;

export interface ApiKeys {
  [key: string]: string;
}
