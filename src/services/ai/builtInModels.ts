/**
 * 内置模型配置
 *
 * 这些 API Key 用于 TestFlight 测试阶段，让用户零配置即可使用。
 * 正式上线前必须迁移到后端代理模式。
 *
 * 安全说明：
 * - TestFlight 阶段用户量小（<100人），Key 泄露风险可控
 * - 通过本地限流（每用户每天 50 条）控制成本
 * - 正式版将改为后端代理，Key 不再存储在客户端
 */

import { type NetworkEnvironment } from './networkDetector';

export interface BuiltInModelConfig {
  provider: 'google' | 'deepseek';
  modelId: string;
  apiModelId: string;
  apiKey: string;
  baseUrl: string;
  label: string;
}

// ⚠️ 请替换为你自己的 API Key
const GEMINI_CONFIG: BuiltInModelConfig = {
  provider: 'google',
  modelId: 'gemini-2.5-flash-builtin',
  apiModelId: 'gemini-2.5-flash-preview-05-20',
  apiKey: 'YOUR_GEMINI_API_KEY_HERE',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  label: 'Hollow AI',
};

const DEEPSEEK_CONFIG: BuiltInModelConfig = {
  provider: 'deepseek',
  modelId: 'deepseek-v3-builtin',
  apiModelId: 'deepseek-chat',
  apiKey: 'sk-c9155dedf0614319a5a69152a42cb169',
  baseUrl: 'https://api.deepseek.com/v1',
  label: 'Hollow AI',
};

/**
 * 根据网络环境返回排序后的内置模型列表
 * 只返回已配置 API Key 的模型（占位符不算）
 *
 * - 中国大陆：DeepSeek 优先，Gemini fallback
 * - 海外：Gemini 优先，DeepSeek fallback
 */
export function getBuiltInModels(env: NetworkEnvironment): BuiltInModelConfig[] {
  const all = env === 'china'
    ? [DEEPSEEK_CONFIG, GEMINI_CONFIG]
    : [GEMINI_CONFIG, DEEPSEEK_CONFIG];

  // 过滤掉未配置真实 Key 的模型
  return all.filter((c) => c.apiKey && !c.apiKey.startsWith('YOUR_'));
}

/**
 * 获取默认内置模型
 */
export function getDefaultBuiltInModel(
  env: NetworkEnvironment,
): BuiltInModelConfig {
  return getBuiltInModels(env)[0];
}

/**
 * 根据 modelId 获取内置模型配置
 */
export function getBuiltInModel(
  modelId: string,
): BuiltInModelConfig | undefined {
  return [GEMINI_CONFIG, DEEPSEEK_CONFIG].find(c => c.modelId === modelId);
}
