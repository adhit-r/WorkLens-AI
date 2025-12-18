/**
 * Shared LLM Types and Interfaces
 * (No imports from implementation files to avoid circular dependencies)
 */

export type LLMProvider = 'gemini' | 'ollama' | 'claude' | 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LLMProviderInterface {
  generate(prompt: string, config?: Partial<LLMConfig>): Promise<LLMResponse>;
  isAvailable(): Promise<boolean>;
}

// Default configurations for each provider
export const DEFAULT_CONFIGS: Record<LLMProvider, Partial<LLMConfig>> = {
  gemini: {
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    maxTokens: 4096,
  },
  ollama: {
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
    temperature: 0.3,
    maxTokens: 2048,
  },
  claude: {
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 2048,
  },
  openai: {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 2048,
  },
};

// Available models for each provider
export const AVAILABLE_MODELS: Record<LLMProvider, string[]> = {
  gemini: [
    'gemini-3-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemma-3-27b',
    'gemma-3-12b',
  ],
  ollama: [
    'llama3.2',
    'llama3.2:1b',
    'llama3.1',
    'mistral',
    'mixtral',
    'codellama',
    'phi3',
    'qwen2.5',
    'deepseek-r1',
  ],
  claude: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ],
};

// Provider descriptions for UI
export const PROVIDER_INFO: Record<LLMProvider, {
  name: string;
  description: string;
  requiresApiKey: boolean;
  isLocal: boolean;
  website: string;
}> = {
  gemini: {
    name: 'Google Gemini',
    description: 'Fast and capable AI from Google. Good balance of speed and quality.',
    requiresApiKey: true,
    isLocal: false,
    website: 'https://aistudio.google.com/app/apikey',
  },
  ollama: {
    name: 'Ollama (Local)',
    description: 'Run AI models locally on your computer. Free, private, no internet required.',
    requiresApiKey: false,
    isLocal: true,
    website: 'https://ollama.ai',
  },
  claude: {
    name: 'Anthropic Claude',
    description: 'Advanced AI with strong reasoning. Best for complex analysis tasks.',
    requiresApiKey: true,
    isLocal: false,
    website: 'https://console.anthropic.com',
  },
  openai: {
    name: 'OpenAI GPT',
    description: 'Industry-standard AI from OpenAI. Widely used and well-documented.',
    requiresApiKey: true,
    isLocal: false,
    website: 'https://platform.openai.com/api-keys',
  },
};

