"use client"

import type React from "react"

import { AlertCircle, Loader2, RefreshCw, Wand2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "../lib/utils"

interface AIContentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedText?: string
  onContentGenerated: (content: string, type: string) => void
  insertMode?: "replace" | "append" | "new-block"
}

interface ContentGenerationResponse {
  generated_content: string
  prompt: string
  type: string
  processing_time: number
  tokens_used?: number
}

interface ContentGenerationRequest {
  prompt: string
  context?: string
  type: "continue" | "expand" | "new" | "brainstorm" | "outline" | "summarize"
  tone?: "professional" | "casual" | "creative" | "academic" | "persuasive"
  length?: "short" | "medium" | "long"
  max_tokens?: number
  temperature?: number
}

interface RephraseRequest {
  text: string
  style: "formal" | "casual" | "creative" | "concise"
  preserve_meaning?: boolean
  max_tokens?: number
  temperature?: number
}

interface RephraseResponse {
  original_text: string
  rephrased_text: string
  style: string
  processing_time: number
  tokens_used?: number
}

class AIService {
  private baseURL: string

  constructor(baseURL = "http://localhost:8000") {
    this.baseURL = baseURL
  }

  private async makeRequest<T>(endpoint: string, body: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Request failed with status ${response.status}`)
      }

      return response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Unable to connect to AI service. Please check your connection.")
      }
      throw error
    }
  }

  async rephrase(request: RephraseRequest): Promise<RephraseResponse> {
    return this.makeRequest<RephraseResponse>("/rephrase", request)
  }

  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
    return this.makeRequest<ContentGenerationResponse>("/generate-content", request)
  }

  async getStyles(): Promise<{ styles: Array<{ key: string; name: string; description: string }> }> {
    const response = await fetch(`${this.baseURL}/styles`)
    if (!response.ok) {
      // Return default styles if endpoint fails
      return {
        styles: [
          { key: "formal", name: "Formal", description: "Professional tone" },
          { key: "casual", name: "Casual", description: "Conversational tone" },
          { key: "creative", name: "Creative", description: "Expressive style" },
          { key: "concise", name: "Concise", description: "Brief and direct" },
        ],
      }
    }
    return response.json()
  }

  async getContentTypes(): Promise<{ types: Array<{ key: string; name: string; description: string }> }> {
    const response = await fetch(`${this.baseURL}/content-types`)
    if (!response.ok) {
      // Return default types if endpoint fails
      return {
        types: [
          { key: "new", name: "New Content", description: "Create new content" },
          { key: "continue", name: "Continue", description: "Continue writing" },
          { key: "expand", name: "Expand", description: "Expand ideas" },
        ],
      }
    }
    return response.json()
  }
}

export interface RephraseModalProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  onRephrase: (rephrasedText: string, style: string) => void
}

const RephraseModal: React.FC<RephraseModalProps> = ({ isOpen, onClose, selectedText, onRephrase }) => {
  const [aiService] = useState(() => new AIService())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})
  const [loadingStyles, setLoadingStyles] = useState<Set<string>>(new Set())

  const styles = [
    {
      key: "formal",
      name: "Formal",
      description: "Professional and business-appropriate tone",
      color: "bg-muted/50 border-border text-foreground",
    },
    {
      key: "casual",
      name: "Casual",
      description: "Conversational and friendly tone",
      color: "bg-muted/50 border-border text-foreground",
    },
    {
      key: "creative",
      name: "Creative",
      description: "Engaging and expressive style",
      color: "bg-muted/50 border-border text-foreground",
    },
    {
      key: "concise",
      name: "Concise",
      description: "Brief and to-the-point",
      color: "bg-muted/50 border-border text-foreground",
    },
  ]

  const handleRephrase = async (style: string) => {
    if (!selectedText.trim()) return

    setLoadingStyles((prev) => new Set([...prev, style]))
    setError(null)

    try {
      const response = await aiService.rephrase({
        text: selectedText,
        style: style as any,
        preserve_meaning: true,
        temperature: 0.7,
      })

      setResults((prev) => ({
        ...prev,
        [style]: response.rephrased_text,
      }))
    } catch (err) {
      console.error("Rephrase Error:", err)
      setError(err instanceof Error ? err.message : "Failed to rephrase text")
    } finally {
      setLoadingStyles((prev) => {
        const newSet = new Set(prev)
        newSet.delete(style)
        return newSet
      })
    }
  }

  const handleRephraseAll = async () => {
    if (!selectedText.trim()) return

    setIsLoading(true)
    setError(null)
    setResults({})

    try {
      const promises = styles.map((style) =>
        aiService
          .rephrase({
            text: selectedText,
            style: style.key as any,
            preserve_meaning: true,
            temperature: 0.7,
          })
          .catch((error) => ({ error, style: style.key })),
      )

      const responses = await Promise.allSettled(promises)
      const newResults: Record<string, string> = {}

      responses.forEach((result, index) => {
        if (result.status === "fulfilled" && !("error" in result.value)) {
          newResults[styles[index].key] = result.value.rephrased_text
        }
      })

      setResults(newResults)

      // If no results, show error
      if (Object.keys(newResults).length === 0) {
        setError("Failed to generate any rephrased versions. Please try again.")
      }
    } catch (err) {
      console.error("Bulk Rephrase Error:", err)
      setError(err instanceof Error ? err.message : "Failed to rephrase text")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseRephrase = (style: string) => {
    const rephrasedText = results[style]
    if (rephrasedText) {
      onRephrase(rephrasedText, style)
      onClose()
    }
  }

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setResults({})
      setError(null)
      setLoadingStyles(new Set())
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-xl border border-border max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Rephrase Text</h2>
              <p className="text-sm text-muted-foreground">Transform your text with different styles</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRephraseAll}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors font-medium"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Rephrase All</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[calc(90vh-100px)] scrollbar-hide">
          <div className="p-6 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Original Text</h3>
            <p className="text-foreground bg-background p-4 rounded-lg border border-border leading-relaxed">
              {selectedText}
            </p>
          </div>

          {error && (
            <div className="p-6 border-b border-border">
              <div className="flex items-center space-x-3 text-red-600 bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            {styles.map((style) => (
              <div key={style.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn("w-3 h-3 rounded-full bg-muted border border-border")} />
                    <div>
                      <h4 className="font-medium text-foreground">{style.name}</h4>
                      <p className="text-sm text-muted-foreground">{style.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRephrase(style.key)}
                    disabled={loadingStyles.has(style.key) || isLoading}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center space-x-2"
                  >
                    {loadingStyles.has(style.key) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Generate</span>
                    )}
                  </button>
                </div>

                {results[style.key] && (
                  <div className="space-y-3">
                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                      <p className="text-foreground leading-relaxed">{results[style.key]}</p>
                    </div>
                    <button
                      onClick={() => handleUseRephrase(style.key)}
                      className="w-full px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium"
                    >
                      Use This Version
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RephraseModal
