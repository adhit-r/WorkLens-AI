"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles,
  Bot,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  Download,
  Settings,
} from "lucide-react"

interface Provider {
  id: string
  name: string
  description: string
  requiresApiKey: boolean
  isLocal: boolean
  website: string
  available: boolean
  models: string[]
}

interface OllamaModel {
  name: string
  description: string
}

export default function AISettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [currentProvider, setCurrentProvider] = useState<string>("")
  const [currentModel, setCurrentModel] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // API Keys (stored in localStorage for demo, should use secure storage in production)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  
  // Ollama specific
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [ollamaAvailable, setOllamaAvailable] = useState(false)
  const [pullingModel, setPullingModel] = useState(false)

  useEffect(() => {
    loadProviders()
    loadSavedConfig()
  }, [])

  const loadProviders = async () => {
    try {
      // In real app, fetch from API
      // const response = await fetch('/api/llm/providers')
      // const data = await response.json()
      
      // Mock data for demo
      const mockProviders: Provider[] = [
        {
          id: "gemini",
          name: "Google Gemini",
          description: "Fast and capable AI from Google. Good balance of speed and quality.",
          requiresApiKey: true,
          isLocal: false,
          website: "https://aistudio.google.com/app/apikey",
          available: true,
          models: ["gemini-3-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemma-3-27b", "gemma-3-12b"],
        },
        {
          id: "ollama",
          name: "Ollama (Local)",
          description: "Run AI models locally on your computer. Free, private, no internet required.",
          requiresApiKey: false,
          isLocal: true,
          website: "https://ollama.ai",
          available: false,
          models: ["llama3.2", "mistral", "codellama", "phi3"],
        },
        {
          id: "claude",
          name: "Anthropic Claude",
          description: "Advanced AI with strong reasoning. Best for complex analysis tasks.",
          requiresApiKey: true,
          isLocal: false,
          website: "https://console.anthropic.com",
          available: false,
          models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
        },
        {
          id: "openai",
          name: "OpenAI GPT",
          description: "Industry-standard AI from OpenAI. Widely used and well-documented.",
          requiresApiKey: true,
          isLocal: false,
          website: "https://platform.openai.com/api-keys",
          available: false,
          models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        },
      ]
      
      setProviders(mockProviders)
      
      // Check Ollama availability
      checkOllamaStatus()
    } catch (error) {
      console.error("Failed to load providers:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadSavedConfig = () => {
    const saved = localStorage.getItem("worklens-llm-config")
    if (saved) {
      const config = JSON.parse(saved)
      setCurrentProvider(config.provider || "gemini")
      setCurrentModel(config.model || "gemini-2.5-flash")
      setApiKeys(config.apiKeys || {})
    } else {
      setCurrentProvider("gemini")
      setCurrentModel("gemini-2.5-flash")
    }
  }

  const saveConfig = () => {
    const config = {
      provider: currentProvider,
      model: currentModel,
      apiKeys,
    }
    localStorage.setItem("worklens-llm-config", JSON.stringify(config))
  }

  const checkOllamaStatus = async () => {
    try {
      const response = await fetch("http://localhost:11434/api/tags")
      if (response.ok) {
        const data = await response.json()
        setOllamaAvailable(true)
        setOllamaModels(data.models?.map((m: any) => m.name) || [])
        
        // Update provider availability
        setProviders(prev => prev.map(p => 
          p.id === "ollama" ? { ...p, available: true } : p
        ))
      }
    } catch {
      setOllamaAvailable(false)
    }
  }

  const testProvider = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (currentProvider === "ollama" && !ollamaAvailable) {
        setTestResult({
          success: false,
          message: "Ollama is not running. Start it with: ollama serve",
        })
      } else if (providers.find(p => p.id === currentProvider)?.requiresApiKey && !apiKeys[currentProvider]) {
        setTestResult({
          success: false,
          message: "Please enter an API key for this provider.",
        })
      } else {
        setTestResult({
          success: true,
          message: `Connected successfully to ${providers.find(p => p.id === currentProvider)?.name}!`,
        })
        saveConfig()
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Failed to connect. Check your configuration.",
      })
    } finally {
      setTesting(false)
    }
  }

  const pullOllamaModel = async (modelName: string) => {
    setPullingModel(true)
    try {
      await fetch("http://localhost:11434/api/pull", {
        method: "POST",
        body: JSON.stringify({ name: modelName }),
      })
      // Refresh model list
      await checkOllamaStatus()
    } catch (error) {
      console.error("Failed to pull model:", error)
    } finally {
      setPullingModel(false)
    }
  }

  const selectedProvider = providers.find(p => p.id === currentProvider)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">AI Configuration</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Select the artificial intelligence model that will power your dashboard insights and chatbot.
          </p>
        </div>
        <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium">Active: {selectedProvider?.name || "None"}</span>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="grid md:grid-cols-2 gap-6">
        {providers.map((provider) => (
          <Card 
            key={provider.id}
            className={`cursor-pointer transition-all ${
              currentProvider === provider.id 
                ? "ring-2 ring-amber-500 bg-amber-500/5" 
                : "hover:bg-accent/50"
            }`}
            onClick={() => {
              setCurrentProvider(provider.id)
              setCurrentModel(provider.models[0])
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    provider.isLocal ? "bg-emerald-500/10" : "bg-blue-500/10"
                  }`}>
                    {provider.id === "gemini" && <Sparkles className="w-5 h-5 text-amber-600" />}
                    {provider.id === "ollama" && <Bot className="w-5 h-5 text-emerald-600" />}
                    {provider.id === "claude" && <Bot className="w-5 h-5 text-blue-600" />}
                    {provider.id === "openai" && <Bot className="w-5 h-5 text-slate-600" />}
                  </div>
                  {provider.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {provider.isLocal && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                      Private / Local
                    </Badge>
                  )}
                  {provider.available ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-300" />
                  )}
                </div>
              </div>
              <CardDescription>{provider.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {currentProvider === provider.id && (
                <div className="space-y-4">
                  {provider.requiresApiKey && (
                    <div className="space-y-2">
                      <Label htmlFor={`apikey-${provider.id}`}>API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`apikey-${provider.id}`}
                          type="password"
                          placeholder="Enter your API key..."
                          value={apiKeys[provider.id] || ""}
                          onChange={(e) => setApiKeys(prev => ({
                            ...prev,
                            [provider.id]: e.target.value,
                          }))}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(provider.website, "_blank")
                          }}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Get your API key from{" "}
                        <a 
                          href={provider.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-amber-500 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {provider.website.replace("https://", "")}
                        </a>
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select 
                      value={currentModel} 
                      onValueChange={setCurrentModel}
                    >
                      <SelectTrigger onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {provider.models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ollama Setup Guide */}
      {currentProvider === "ollama" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Ollama Setup Guide
            </CardTitle>
            <CardDescription>
              Run AI models locally on your computer - free and private
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-accent/50 border border-border/50">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Step 1</div>
                <h4 className="font-medium mb-1">Download</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Install the Ollama software from their official site.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => window.open("https://ollama.ai", "_blank")}
                >
                  Visit Ollama.ai
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-accent/50 border border-border/50">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Step 2</div>
                <h4 className="font-medium mb-1">Activate</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Open your terminal and type this command:
                </p>
                <code className="block p-2 bg-background rounded text-xs font-mono border">
                  ollama serve
                </code>
              </div>
              
              <div className="p-4 rounded-lg bg-accent/50 border border-border/50">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Step 3</div>
                <h4 className="font-medium mb-1">Get Model</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Download the Llama model by typing:
                </p>
                <code className="block p-2 bg-background rounded text-xs font-mono border">
                  ollama pull llama3.2
                </code>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className={`w-3 h-3 rounded-full ${ollamaAvailable ? "bg-emerald-500" : "bg-red-500"}`} />
              <div className="flex-1">
                <p className="font-medium">
                  {ollamaAvailable ? "Ollama is running" : "Ollama is not running"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ollamaAvailable 
                    ? `${ollamaModels.length} models available locally`
                    : "Start Ollama to use local AI models"
                  }
                </p>
              </div>
              <Button variant="outline" onClick={checkOllamaStatus}>
                Refresh
              </Button>
            </div>

            {ollamaAvailable && ollamaModels.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Installed Models</h4>
                <div className="flex flex-wrap gap-2">
                  {ollamaModels.map((model) => (
                    <Badge key={model} variant="secondary">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-3">Recommended Models</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { name: "llama3.2", desc: "Best for general use (3.8GB)" },
                  { name: "mistral", desc: "Fast and efficient (4.1GB)" },
                  { name: "codellama", desc: "Code generation (3.8GB)" },
                  { name: "phi3", desc: "Small but capable (1.7GB)" },
                ].map((model) => (
                  <div 
                    key={model.name}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{model.name}</p>
                      <p className="text-sm text-muted-foreground">{model.desc}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={ollamaModels.includes(model.name) || pullingModel || !ollamaAvailable}
                      onClick={() => pullOllamaModel(model.name)}
                    >
                      {ollamaModels.includes(model.name) ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Test Connection</CardTitle>
          <CardDescription>
            Verify your AI provider is configured correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={testProvider} 
              disabled={testing}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            
            {testResult && (
              <div className={`flex items-center gap-2 ${
                testResult.success ? "text-emerald-500" : "text-red-500"
              }`}>
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

