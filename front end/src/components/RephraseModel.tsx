"use client"

import type React from "react"

import { AlertCircle, Loader2, RefreshCw, Wand2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "../lib/utils"
import AIService from "@/lib/aiService"


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
      color: "bg-primary/10 border-primary/20 text-primary",
    },
    {
      key: "casual",
      name: "Casual",
      description: "Conversational and friendly tone",
      color: "bg-secondary/10 border-secondary/20 text-secondary",
    },
    {
      key: "creative",
      name: "Creative",
      description: "Engaging and expressive style",
      color: "bg-accent/10 border-accent/20 text-accent-foreground",
    },
    {
      key: "concise",
      name: "Concise",
      description: "Brief and to-the-point",
      color: "bg-muted/50 border-muted text-muted-foreground",
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-2xl border border-border max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-primary" />
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
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Rephrase All</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-xl transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[calc(90vh-100px)] scrollbar-hide">
          <div className="p-6 border-b border-border bg-muted/20">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Original Text</h3>
            <p className="text-foreground bg-background p-4 rounded-xl border border-border leading-relaxed shadow-sm">
              {selectedText}
            </p>
          </div>

          {error && (
            <div className="p-6 border-b border-border">
              <div className="flex items-center space-x-3 text-red-600 bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
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
                    <div className={cn("w-3 h-3 rounded-full", style.color.split(" ")[0])} />
                    <div>
                      <h4 className="font-medium text-foreground">{style.name}</h4>
                      <p className="text-sm text-muted-foreground">{style.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRephrase(style.key)}
                    disabled={loadingStyles.has(style.key) || isLoading}
                    className="px-4 py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl transition-all duration-200 disabled:opacity-50 font-medium flex items-center space-x-2 border border-secondary/20"
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
                    <div className="bg-muted/20 border border-border rounded-xl p-4 shadow-sm">
                      <p className="text-foreground leading-relaxed">{results[style.key]}</p>
                    </div>
                    <button
                      onClick={() => handleUseRephrase(style.key)}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-medium shadow-sm"
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
