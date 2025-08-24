"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Sparkles, X } from "lucide-react"
import { useState } from "react"

interface AIContentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedText?: string
  onContentGenerated: (content: string) => void
  insertMode?: string
}

interface ContentGenerationRequest {
  tone: string
  length: string
}

const AIContentModal: React.FC<AIContentModalProps> = ({
  isOpen,
  onClose,
  selectedText = "",
  onContentGenerated,
  insertMode = "new-block",
}) => {
  const [activeTab, setActiveTab] = useState("generate")
  const [selectedType, setSelectedType] = useState("new")
  const [prompt, setPrompt] = useState("")
  const [selectedTone, setSelectedTone] = useState("")
  const [selectedLength, setSelectedLength] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const contentTypes = [
    {
      key: "new" as const,
      name: "New Content",
      description: "Create completely new content from your prompt",
      icon: <Sparkles className="h-4 w-4" />,
      color: "bg-muted text-foreground",
    },
    {
      key: "continue" as const,
      name: "Continue Writing",
      description: "Continue from where the selected text left off",
      icon: <RefreshCw className="h-4 w-4" />,
      color: "bg-muted text-foreground",
    },
    {
      key: "expand" as const,
      name: "Expand Ideas",
      description: "Elaborate and expand on the selected content",
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "bg-muted text-foreground",
    },
    {
      key: "brainstorm" as const,
      name: "Brainstorm",
      description: "Generate ideas and bullet points on the topic",
      icon: <Sparkles className="h-4 w-4" />,
      color: "bg-muted text-foreground",
    },
    {
      key: "outline" as const,
      name: "Create Outline",
      description: "Generate a structured outline for the topic",
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "bg-muted text-foreground",
    },
    {
      key: "summarize" as const,
      name: "Summarize",
      description: "Create a concise summary of the selected content",
      icon: <RefreshCw className="h-4 w-4" />,
      color: "bg-muted text-foreground",
    },
  ]

  const tones = [
    { key: "formal", name: "Formal", description: "Use a formal tone" },
    { key: "casual", name: "Casual", description: "Use a casual tone" },
  ]

  const lengths = [
    { key: "short", name: "Short", description: "Generate a short content" },
    { key: "medium", name: "Medium", description: "Generate a medium content" },
    { key: "long", name: "Long", description: "Generate a long content" },
  ]

  const handleGenerate = async () => {
    setIsLoading(true)
    setError("")

    try {
      // Simulate AI content generation
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, selectedType, selectedTone, selectedLength }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate content")
      }

      const data = await response.json()
      setGeneratedContent(data.content)
      setActiveTab("result")
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setIsLoading(true)
    setError("")

    try {
      // Simulate AI content regeneration
      const response = await fetch("/api/regenerate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, selectedType, selectedTone, selectedLength }),
      })

      if (!response.ok) {
        throw new Error("Failed to regenerate content")
      }

      const data = await response.json()
      setGeneratedContent(data.content)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseContent = () => {
    onContentGenerated(generatedContent)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-xl border border-border max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">AI Content Generator</h2>
              <p className="text-sm text-muted-foreground">Create intelligent content with AI assistance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(90vh-100px)]">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("generate")}
              className={cn(
                "px-6 py-3 font-medium transition-colors border-b-2",
                activeTab === "generate"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Generate Content
            </button>
            <button
              onClick={() => setActiveTab("result")}
              disabled={!generatedContent}
              className={cn(
                "px-6 py-3 font-medium transition-colors border-b-2",
                activeTab === "result" && generatedContent
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
                !generatedContent && "opacity-50 cursor-not-allowed",
              )}
            >
              Generated Content
            </button>
          </div>

          {activeTab === "generate" && (
            <div className="p-6 space-y-6">
              {selectedText && (
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Selected Context
                  </h3>
                  <p className="text-foreground leading-relaxed max-h-24 overflow-auto bg-background p-3 rounded border">
                    {selectedText}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Content Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contentTypes.map((type) => (
                    <button
                      key={type.key}
                      onClick={() => setSelectedType(type.key)}
                      disabled={type.key === "continue" && !selectedText}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-colors",
                        selectedType === type.key
                          ? "border-foreground bg-muted/50"
                          : "border-border hover:border-muted-foreground hover:bg-muted/30",
                        type.key === "continue" && !selectedText && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={cn("w-8 h-8 rounded flex items-center justify-center flex-shrink-0", type.color)}
                        >
                          {type.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground mb-1">{type.name}</h4>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block font-medium text-foreground">
                  {selectedType === "new" ? "Content Prompt" : "Additional Instructions"}
                  {selectedType === "new" && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    selectedType === "new"
                      ? "Describe what you want to write about..."
                      : "Any specific instructions or direction for the AI..."
                  }
                  className="w-full h-28 p-3 rounded-lg border border-border bg-background resize-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-colors placeholder:text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block font-medium text-foreground">Tone</label>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value as ContentGenerationRequest["tone"])}
                    className="w-full p-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-colors"
                  >
                    {tones.map((tone) => (
                      <option key={tone.key} value={tone.key}>
                        {tone.name} - {tone.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block font-medium text-foreground">Length</label>
                  <select
                    value={selectedLength}
                    onChange={(e) => setSelectedLength(e.target.value as ContentGenerationRequest["length"])}
                    className="w-full p-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-colors"
                  >
                    {lengths.map((length) => (
                      <option key={length.key} value={length.key}>
                        {length.name} - {length.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block font-medium text-transparent">Action</label>
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || (selectedType === "new" && !prompt.trim())}
                    className="w-full px-6 py-3 bg-foreground text-background rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2 font-medium"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-3 text-red-600 bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "result" && generatedContent && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-lg">Generated Content</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleRegenerate}
                    disabled={isLoading}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors flex items-center space-x-2 font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-6 max-h-80 overflow-auto">
                <div className="prose max-w-none">
                  {generatedContent.split("\n").map(
                    (paragraph, index) =>
                      paragraph.trim() && (
                        <p key={index} className="mb-4 text-foreground leading-relaxed">
                          {paragraph}
                        </p>
                      ),
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setActiveTab("generate")}
                  className="px-6 py-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors font-medium"
                >
                  Edit Settings
                </button>
                <button
                  onClick={handleUseContent}
                  className="px-8 py-3 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors flex items-center space-x-2 font-medium"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Use This Content</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AIContentModal
