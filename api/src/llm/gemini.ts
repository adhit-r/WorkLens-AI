import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProviderInterface, LLMResponse, LLMConfig } from './types';

export class GeminiProvider implements LLMProviderInterface {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
  }

  async generate(prompt: string, config?: Partial<LLMConfig>): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const modelName = config?.model || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: config?.temperature || 0.3,
        maxOutputTokens: config?.maxTokens || 4096,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    return {
      content: response.text(),
      usage: {
        promptTokens: 0, // Gemini doesn't expose this in the same way
        completionTokens: 0,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      await model.generateContent('test');
      return true;
    } catch {
      return false;
    }
  }
}

