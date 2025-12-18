/**
 * Unified LLM Client
 * Automatically switches between providers based on configuration
 */

import { GeminiProvider } from './gemini';
import { OllamaProvider } from './ollama';
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';
import {
  LLMProvider,
  LLMConfig,
  LLMResponse,
  LLMProviderInterface,
  DEFAULT_CONFIGS,
  AVAILABLE_MODELS,
  PROVIDER_INFO,
} from './types';

export class UnifiedLLMClient {
  private config: LLMConfig;
  private provider: LLMProviderInterface;

  constructor(config?: Partial<LLMConfig>) {
    // Determine provider from environment or config
    const providerFromEnv = this.detectProviderFromEnv();
    const selectedProvider = config?.provider || providerFromEnv || 'gemini';

    this.config = {
      provider: selectedProvider,
      ...DEFAULT_CONFIGS[selectedProvider],
      ...config,
    } as LLMConfig;

    this.provider = this.createProvider(this.config);
  }

  private detectProviderFromEnv(): LLMProvider | null {
    // Check which API keys are available
    if (process.env.OLLAMA_ENABLED === 'true') return 'ollama';
    if (process.env.GEMINI_API_KEY) return 'gemini';
    if (process.env.ANTHROPIC_API_KEY) return 'claude';
    if (process.env.OPENAI_API_KEY) return 'openai';
    return null;
  }

  private createProvider(config: LLMConfig): LLMProviderInterface {
    switch (config.provider) {
      case 'gemini':
        return new GeminiProvider(config.apiKey);
      case 'ollama':
        return new OllamaProvider(config.baseUrl);
      case 'claude':
        return new ClaudeProvider(config.apiKey);
      case 'openai':
        return new OpenAIProvider(config.apiKey, config.baseUrl);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  async generate(prompt: string): Promise<LLMResponse> {
    return this.provider.generate(prompt, this.config);
  }

  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  getProviderName(): string {
    return PROVIDER_INFO[this.config.provider].name;
  }

  // Static methods for API routes
  static getAvailableProviders(): typeof PROVIDER_INFO {
    return PROVIDER_INFO;
  }

  static getAvailableModels(provider: LLMProvider): string[] {
    return AVAILABLE_MODELS[provider] || [];
  }

  static async checkProviderStatus(): Promise<Record<LLMProvider, boolean>> {
    const results: Partial<Record<LLMProvider, boolean>> = {};

    // Check Gemini
    const gemini = new GeminiProvider();
    results.gemini = await gemini.isAvailable();

    // Check Ollama
    const ollama = new OllamaProvider();
    results.ollama = await ollama.isAvailable();

    // Check Claude
    const claude = new ClaudeProvider();
    results.claude = await claude.isAvailable();

    // Check OpenAI
    const openai = new OpenAIProvider();
    results.openai = await openai.isAvailable();

    return results as Record<LLMProvider, boolean>;
  }
}

export * from './types';
