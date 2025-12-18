import { Hono } from 'hono';
import { UnifiedLLMClient, PROVIDER_INFO, AVAILABLE_MODELS, LLMProvider } from '../llm';
import { OllamaProvider } from '../llm/ollama';

const app = new Hono();

/**
 * GET /api/llm/providers
 * List all available LLM providers and their status
 */
app.get('/providers', async (c) => {
  const status = await UnifiedLLMClient.checkProviderStatus();
  
  const providers = Object.entries(PROVIDER_INFO).map(([key, info]) => ({
    id: key,
    ...info,
    available: status[key as LLMProvider],
    models: AVAILABLE_MODELS[key as LLMProvider],
  }));

  return c.json({ providers });
});

/**
 * GET /api/llm/status
 * Check current LLM configuration and availability
 */
app.get('/status', async (c) => {
  const client = new UnifiedLLMClient();
  const config = client.getConfig();
  const available = await client.isAvailable();

  return c.json({
    currentProvider: config.provider,
    providerName: client.getProviderName(),
    model: config.model,
    available,
    config: {
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    },
  });
});

/**
 * POST /api/llm/test
 * Test a specific provider with a simple prompt
 */
app.post('/test', async (c) => {
  try {
    const body = await c.req.json();
    const { provider, model, apiKey, baseUrl } = body;

    const client = new UnifiedLLMClient({
      provider,
      model,
      apiKey,
      baseUrl,
    });

    const available = await client.isAvailable();
    
    if (!available) {
      return c.json({ 
        success: false, 
        error: 'Provider not available. Check API key or connection.' 
      });
    }

    // Quick test
    const response = await client.generate('Say "Hello from WorkLens" in exactly 5 words.');

    return c.json({
      success: true,
      response: response.content,
      usage: response.usage,
    });
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/llm/ollama/models
 * List locally available Ollama models
 */
app.get('/ollama/models', async (c) => {
  try {
    const ollama = new OllamaProvider();
    const available = await ollama.isAvailable();
    
    if (!available) {
      return c.json({ 
        available: false,
        models: [],
        message: 'Ollama is not running. Start it with: ollama serve'
      });
    }

    const models = await ollama.listModels();
    
    return c.json({
      available: true,
      models,
      suggested: [
        { name: 'llama3.2', description: 'Latest Llama model, good for general use' },
        { name: 'mistral', description: 'Fast and efficient, great for chat' },
        { name: 'codellama', description: 'Specialized for code tasks' },
        { name: 'phi3', description: 'Microsoft\'s small but capable model' },
      ],
    });
  } catch (error: any) {
    return c.json({ 
      available: false, 
      models: [],
      error: error.message 
    });
  }
});

/**
 * POST /api/llm/ollama/pull
 * Pull a new model to Ollama
 */
app.post('/ollama/pull', async (c) => {
  try {
    const body = await c.req.json();
    const { model } = body;

    const ollama = new OllamaProvider();
    await ollama.pullModel(model);

    return c.json({ 
      success: true, 
      message: `Started pulling ${model}. This may take a few minutes.` 
    });
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    });
  }
});

export { app as llmRoutes };

