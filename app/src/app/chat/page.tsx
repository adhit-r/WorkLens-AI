"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  sql?: string
}

export default function ChatPage() {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Hello! I can help you understand team workload, tasks, and project status. What would you like to know?",
        timestamp: new Date(),
      },
    ])
  }, [])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const savedConfig = localStorage.getItem("worklens-llm-config")
      const config = savedConfig ? JSON.parse(savedConfig) : {}

      const response = await api.sendMessage(
        input,
        "descriptive",
        sessionId,
        config.provider,
        config.model
      ) as any

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
        sql: response.sql,
      }

      if (response.sessionId) {
        setSessionId(response.sessionId)
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please make sure the API is running and try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const quickQuestions = [
    "Show all active tasks across the team",
    "What is the team bandwidth this week?",
    "List overdue tasks",
    "Show project delivery status",
  ]

  return (
    <div className="flex flex-col h-screen">
      {/* Simple Header */}
      <div className="border-b bg-white dark:bg-slate-950 px-6 py-4">
        <h1 className="text-xl font-semibold">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">Ask questions about team workload and projects</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-emerald-600" />
                </div>
              )}
              <div
                className={`rounded-lg px-4 py-3 max-w-[85%] ${
                  message.role === "user"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
                {message.sql && (
                  <details className="mt-3">
                    <summary className="text-xs text-muted-foreground cursor-pointer">View SQL Query</summary>
                    <pre className="mt-2 p-2 bg-slate-900 text-emerald-400 rounded text-xs overflow-x-auto">
                      {message.sql}
                    </pre>
                  </details>
                )}
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-emerald-600 animate-pulse" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="border-t bg-slate-50 dark:bg-slate-900 px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-medium text-muted-foreground mb-3">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setInput(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white dark:bg-slate-950 p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about team workload, tasks, or projects..."
            className="min-h-[60px] max-h-32 resize-none"
            rows={2}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            onClick={handleSend}
            size="icon"
            className="shrink-0 h-[60px] w-[60px] bg-emerald-500 hover:bg-emerald-600"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
