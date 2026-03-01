import type { ModelInfo, ModelProvider } from '../../types/settings';

/**
 * Provider base URLs for OpenAI-compatible APIs.
 * Anthropic uses its own protocol; Google uses OpenAI-compatible via generativelanguage endpoint.
 */
export const PROVIDER_BASE_URLS: Record<ModelProvider, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  minimax: 'https://api.minimax.chat/v1',
  deepseek: 'https://api.deepseek.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  moonshot: 'https://api.moonshot.cn/v1',
  baichuan: 'https://api.baichuan-ai.com/v1',
  yi: 'https://api.lingyiwanwu.com/v1',
  stepfun: 'https://api.stepfun.com/v1',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  spark: 'https://spark-api-open.xf-yun.com/v1',
  manus: 'https://api.manus.ai',
};

export const MODEL_LIST: ModelInfo[] = [
  // — Anthropic —
  {
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    provider: 'anthropic',
    apiModelId: 'claude-opus-4-6',
    apiKeyField: 'anthropicApiKey',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    apiModelId: 'claude-sonnet-4-6',
    apiKeyField: 'anthropicApiKey',
  },
  // — OpenAI —
  {
    id: 'gpt-5.2',
    label: 'GPT-5.2',
    provider: 'openai',
    apiModelId: 'gpt-5.2',
    apiKeyField: 'openaiApiKey',
  },
  {
    id: 'gpt-5.2-pro',
    label: 'GPT-5.2 Pro',
    provider: 'openai',
    apiModelId: 'gpt-5.2-pro',
    apiKeyField: 'openaiApiKey',
  },
  {
    id: 'o3',
    label: 'o3',
    provider: 'openai',
    apiModelId: 'o3',
    apiKeyField: 'openaiApiKey',
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'openai',
    apiModelId: 'gpt-4o-mini',
    apiKeyField: 'openaiApiKey',
  },
  // — Google —
  {
    id: 'gemini-3.1-pro',
    label: 'Gemini 3.1 Pro',
    provider: 'google',
    apiModelId: 'gemini-3.1-pro-preview',
    apiKeyField: 'googleApiKey',
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'google',
    apiModelId: 'gemini-2.5-flash-preview-05-20',
    apiKeyField: 'googleApiKey',
  },
  // — DeepSeek —
  {
    id: 'deepseek-v3.2',
    label: 'DeepSeek V3.2',
    provider: 'deepseek',
    apiModelId: 'deepseek-chat',
    apiKeyField: 'deepseekApiKey',
  },
  {
    id: 'deepseek-r1',
    label: 'DeepSeek R1',
    provider: 'deepseek',
    apiModelId: 'deepseek-reasoner',
    apiKeyField: 'deepseekApiKey',
  },
  // — 智谱 GLM —
  {
    id: 'glm-5',
    label: 'GLM-5',
    provider: 'zhipu',
    apiModelId: 'glm-5',
    apiKeyField: 'zhipuApiKey',
  },
  {
    id: 'glm-4-flash',
    label: 'GLM-4 Flash',
    provider: 'zhipu',
    apiModelId: 'glm-4-flash',
    apiKeyField: 'zhipuApiKey',
  },
  // — 通义千问 Qwen —
  {
    id: 'qwen3-max',
    label: 'Qwen3 Max',
    provider: 'qwen',
    apiModelId: 'qwen3-max',
    apiKeyField: 'qwenApiKey',
  },
  {
    id: 'qwen3.5-plus',
    label: 'Qwen3.5 Plus',
    provider: 'qwen',
    apiModelId: 'qwen3.5-plus',
    apiKeyField: 'qwenApiKey',
  },
  // — MiniMax —
  {
    id: 'minimax-text-01',
    label: 'MiniMax Text-01',
    provider: 'minimax',
    apiModelId: 'MiniMax-Text-01',
    apiKeyField: 'minimaxApiKey',
  },
  // — Moonshot (月之暗面 Kimi) —
  {
    id: 'kimi-k2.5',
    label: 'Kimi K2.5',
    provider: 'moonshot',
    apiModelId: 'kimi-k2.5',
    apiKeyField: 'moonshotApiKey',
  },
  // — 百川 Baichuan —
  {
    id: 'baichuan4',
    label: 'Baichuan 4',
    provider: 'baichuan',
    apiModelId: 'Baichuan4',
    apiKeyField: 'baichuanApiKey',
  },
  // — 零一万物 Yi —
  {
    id: 'yi-large',
    label: 'Yi Large',
    provider: 'yi',
    apiModelId: 'yi-large',
    apiKeyField: 'yiApiKey',
  },
  // — 阶跃星辰 StepFun —
  {
    id: 'step-2-16k',
    label: 'Step-2',
    provider: 'stepfun',
    apiModelId: 'step-2-16k',
    apiKeyField: 'stepfunApiKey',
  },
  // — 豆包 Doubao (字节) —
  {
    id: 'doubao-pro-256k',
    label: 'Doubao Pro',
    provider: 'doubao',
    apiModelId: 'doubao-pro-256k',
    apiKeyField: 'doubaoApiKey',
  },
  // — 讯飞星火 Spark —
  {
    id: 'spark-max',
    label: 'Spark Max',
    provider: 'spark',
    apiModelId: 'generalv3.5',
    apiKeyField: 'sparkApiKey',
  },
  // — Manus —
  {
    id: 'manus',
    label: 'Manus',
    provider: 'manus',
    apiModelId: 'manus-1.6',
    apiKeyField: 'manusApiKey',
  },
];

export function getModelInfo(modelId: string): ModelInfo | undefined {
  return MODEL_LIST.find((m) => m.id === modelId);
}
