"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Sparkles, X } from "lucide-react"
import { useState, useEffect } from "react"
import axios, { AxiosError } from "axios"

// Fixed interface to match backend expectations exactly
interface ContentGenerationRequest {
  prompt: string
  context?: string  // Backend expects 'context', not 'selectedText'
  type: string      // Backend expects 'type', not 'selectedType'
  tone: string      // Backend expects 'tone', not 'selectedTone'
  length: string    // Backend expects 'length', not 'selectedLength'
  max_tokens?: number
  temperature?: number
}

interface AIContentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedText?: string
  onContentGenerated: (content: string) => void
  insertMode?: string
}

// Configure axios instance for AI backend
const aiAPI = axios.create({
  baseURL: 'http://localhost:8000/',
  timeout: 30000, // 30 seconds timeout for AI generation
  headers: {
    'Content-Type': 'application/json',
  }
})

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
  const [selectedTone, setSelectedTone] = useState("professional")
  const [selectedLength, setSelectedLength] = useState("medium")
  const [generatedContent, setGeneratedContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Effect to reset state when modal opens with new selected text
  useEffect(() => {
    if (isOpen) {
      // If we have selected text, default to continue writing
      if (selectedText && selectedText.trim()) {
        setSelectedType("continue") // Default to continue when text is selected
        setPrompt("") // Clear prompt to avoid conflicts
      } else {
        setSelectedType("new") // Default to new when no text is selected
      }
      // Clear previous generated content and errors
      setGeneratedContent("")
      setError("")
      setActiveTab("generate")
    }
  }, [isOpen, selectedText])

  const contentTypes = [
    {
      key: "new" as const,
      name: "New Content",
      description: "Create completely new content from your prompt",
      icon: <Sparkles className="h-4 w-4" />,
      color: "bg-muted text-foreground",
      requiresContext: false
    },
    {
      key: "continue" as const,
      name: "Continue Writing",
      description: "Continue from where the selected text left off",
      icon: <RefreshCw className="h-4 w-4" />,
      color: "bg-muted text-foreground",
      requiresContext: true
    },
    {
      key: "expand" as const,
      name: "Expand Ideas",
      description: "Elaborate and expand on the selected content",
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "bg-muted text-foreground",
      requiresContext: true
    },
    {
      key: "brainstorm" as const,
      name: "Brainstorm",
      description: "Generate ideas and bullet points on the topic",
      icon: <Sparkles className="h-4 w-4" />,
      color: "bg-muted text-foreground",
      requiresContext: false
    },
    {
      key: "outline" as const,
      name: "Create Outline",
      description: "Generate a structured outline for the topic",
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "bg-muted text-foreground",
      requiresContext: false
    },
    {
      key: "summarize" as const,
      name: "Summarize",
      description: "Create a concise summary of the selected content",
      icon: <RefreshCw className="h-4 w-4" />,
      color: "bg-muted text-foreground",
      requiresContext: true
    },
  ]

  const tones = [
    { key: "professional", name: "Professional", description: "Business-appropriate, formal tone" },
    { key: "casual", name: "Casual", description: "Friendly, conversational tone" },
    { key: "creative", name: "Creative", description: "Imaginative and engaging style" },
    { key: "academic", name: "Academic", description: "Scholarly, research-oriented tone" },
    { key: "persuasive", name: "Persuasive", description: "Convincing and compelling tone" },
  ]

  const lengths = [
    { key: "short", name: "Short", description: "1-2 paragraphs" },
    { key: "medium", name: "Medium", description: "3-5 paragraphs" },
    { key: "long", name: "Long", description: "6+ paragraphs" },
  ]

  // Fixed handleGenerate function with correct field mapping
  const handleGenerate = async () => {
    setIsLoading(true)
    setError("")

    // Get current content type info
    const currentType = contentTypes.find(type => type.key === selectedType)

    // For content types that require context, check if selectedText is available
    if (currentType?.requiresContext && !selectedText?.trim()) {
      setError(`${currentType.name} requires selected text as context. Please select some text first.`)
      setIsLoading(false)
      return
    }

    // Validation: For new content or brainstorm/outline, prompt is required
    if ((selectedType === "new" || selectedType === "brainstorm" || selectedType === "outline") && !prompt.trim()) {
      setError("Please enter a prompt to describe what you want to generate.")
      setIsLoading(false)
      return
    }

    // For continue writing, use a default prompt if none provided
    let finalPrompt = prompt.trim()
    if (selectedType === "continue" && !finalPrompt) {
      finalPrompt = "Continue writing naturally from where this text left off, maintaining the same tone and style."
    }
    
    // For expand, use a default prompt if none provided
    if (selectedType === "expand" && !finalPrompt) {
      finalPrompt = "Expand and elaborate on the ideas presented in this text, adding more detail and depth."
    }

    // For summarize, use a default prompt if none provided
    if (selectedType === "summarize" && !finalPrompt) {
      finalPrompt = "Create a clear and concise summary of the main points in this text."
    }

    // Validate tone and length are selected
    if (!selectedTone) {
      setError("Please select a tone for the content.")
      setIsLoading(false)
      return
    }

    if (!selectedLength) {
      setError("Please select a length for the content.")
      setIsLoading(false)
      return
    }

    console.log('====================================')
    console.log("Generating content with:")
    console.log("Type:", selectedType)
    console.log("Prompt:", finalPrompt)
    console.log("Context (selectedText):", selectedText)
    console.log("Tone:", selectedTone)
    console.log("Length:", selectedLength)
    console.log('====================================')

    try {
      // Map frontend fields to backend expected fields EXACTLY as the backend expects
      const requestData: ContentGenerationRequest = {
        prompt: finalPrompt,
        type: selectedType,        // Backend expects 'type'
        tone: selectedTone,        // Backend expects 'tone'  
        length: selectedLength,    // Backend expects 'length'
        context: currentType?.requiresContext ? selectedText : undefined, // Backend expects 'context'
        max_tokens: 1000,
        temperature: 0.7
      }

      console.log('Sending request data to backend:', requestData)

      const response = await aiAPI.post('/generate-content', requestData)
      
      console.log('Full API response:', response)
      console.log('Response data:', response.data)
      
      // The backend returns { generated_content: "..." }
      const content = response.data?.generated_content

      if (content && typeof content === 'string' && content.trim()) {
        setGeneratedContent(content)
        setActiveTab("result")
        setError("") // Clear any previous errors
      } else {
        throw new Error(
          `Invalid or empty response format. Expected generated_content field with string value, got: ${JSON.stringify(response.data, null, 2)}`
        )
      }
    } catch (err) {
      console.error('Content generation error:', err)
      
      if (err instanceof AxiosError) {
        if (err.code === 'ECONNREFUSED') {
          setError("Unable to connect to AI backend. Please ensure the server is running on port 8000.")
        } else if (err.code === 'ECONNABORTED') {
          setError("Request timeout. The AI is taking too long to generate content.")
        } else if (err.response?.status === 422) {
          // Unprocessable Entity - validation error
          const validationDetails = err.response?.data?.detail || err.response?.data?.message || "Validation failed"
          setError(`Validation error: ${Array.isArray(validationDetails) ? validationDetails.map(v => v.msg || v.message).join(', ') : validationDetails}`)
        } else if (err.response?.status === 400) {
          const errorMessage = err.response?.data?.detail || err.response?.data?.message || "Bad request"
          setError(`Request error: ${errorMessage}`)
        } else if (err.response?.status === 429) {
          setError("Rate limit exceeded. Please wait a moment before trying again.")
        } else if (err.response?.status >= 500) {
          setError("AI backend error. Please try again later.")
        } else if (err.response?.data?.error) {
          setError(err.response.data.error)
        } else {
          setError(`Request failed: ${err.message}`)
        }
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Fixed handleRegenerate function
  const handleRegenerate = async () => {
    setIsLoading(true)
    setError("")

    // Get current content type info
    const currentType = contentTypes.find(type => type.key === selectedType)

    // For content types that require context, check if selectedText is available
    if (currentType?.requiresContext && !selectedText?.trim()) {
      setError(`${currentType.name} requires selected text as context. Please select some text first.`)
      setIsLoading(false)
      return
    }

    // Validation: For new content or brainstorm/outline, prompt is required
    if ((selectedType === "new" || selectedType === "brainstorm" || selectedType === "outline") && !prompt.trim()) {
      setError("Please enter a prompt to describe what you want to generate.")
      setIsLoading(false)
      return
    }

    // For continue writing, use a default prompt if none provided
    let finalPrompt = prompt.trim()
    if (selectedType === "continue" && !finalPrompt) {
      finalPrompt = "Continue writing naturally from where this text left off, maintaining the same tone and style."
    }
    
    // For expand, use a default prompt if none provided
    if (selectedType === "expand" && !finalPrompt) {
      finalPrompt = "Expand and elaborate on the ideas presented in this text, adding more detail and depth."
    }

    // For summarize, use a default prompt if none provided
    if (selectedType === "summarize" && !finalPrompt) {
      finalPrompt = "Create a clear and concise summary of the main points in this text."
    }

    if (!selectedTone) {
      setError("Please select a tone for the content.")
      setIsLoading(false)
      return
    }

    if (!selectedLength) {
      setError("Please select a length for the content.")
      setIsLoading(false)
      return
    }

    try {
      const requestData: ContentGenerationRequest = {
        prompt: finalPrompt,
        type: selectedType,        // Backend expects 'type'
        tone: selectedTone,        // Backend expects 'tone'
        length: selectedLength,    // Backend expects 'length'
        context: currentType?.requiresContext ? selectedText : undefined, // Backend expects 'context'
        max_tokens: 1000,
        temperature: 0.8 // Slightly higher temperature for variation
      }

      console.log('Regenerate request data:', requestData)

      const response = await aiAPI.post('/generate-content', requestData)
      
      console.log('Regenerate API response:', response)
      
      const content = response.data?.generated_content
      
      if (content && typeof content === 'string' && content.trim()) {
        setGeneratedContent(content)
        setError("") // Clear any previous errors
      } else {
        throw new Error(
          `Invalid or empty response format. Expected generated_content field with string value, got: ${JSON.stringify(response.data, null, 2)}`
        )
      }
    } catch (err) {
      console.error('Content regeneration error:', err)
      
      if (err instanceof AxiosError) {
        if (err.code === 'ECONNREFUSED') {
          setError("Unable to connect to AI backend. Please ensure the server is running on port 8000.")
        } else if (err.code === 'ECONNABORTED') {
          setError("Request timeout. The AI is taking too long to regenerate content.")
        } else if (err.response?.status === 422) {
          const validationDetails = err.response?.data?.detail || err.response?.data?.message || "Validation failed"
          setError(`Validation error: ${Array.isArray(validationDetails) ? validationDetails.map(v => v.msg || v.message).join(', ') : validationDetails}`)
        } else if (err.response?.status === 400) {
          const errorMessage = err.response?.data?.detail || err.response?.data?.message || "Bad request"
          setError(`Request error: ${errorMessage}`)
        } else if (err.response?.status === 429) {
          setError("Rate limit exceeded. Please wait a moment before trying again.")
        } else if (err.response?.status >= 500) {
          setError("AI backend error. Please try again later.")
        } else if (err.response?.data?.error) {
          setError(err.response.data.error)
        } else {
          setError(`Request failed: ${err.message}`)
        }
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseContent = () => {
    onContentGenerated(generatedContent)
    onClose()
  }

  // Helper function to get appropriate placeholder text
  const getPromptPlaceholder = () => {
    switch (selectedType) {
      case "continue":
        return "Optional: Describe how you want the text to continue... (leave empty for natural continuation)"
      case "expand":
        return "Optional: What aspects should be expanded... (leave empty for general expansion)"
      case "summarize":
        return "Optional: Any specific focus for the summary... (leave empty for general summary)"
      case "brainstorm":
        return "What topic do you want to brainstorm ideas about..."
      case "outline":
        return "What topic do you need an outline for..."
      default:
        return "Describe what you want to write about..."
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-2xl border border-border max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">AI Content Generator</h2>
              <p className="text-sm text-muted-foreground">Create intelligent content with AI assistance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-auto  max-h-[calc(90vh-100px)]">
          <div className="flex border-b gap-2 p-2 border-border">
            <button
              onClick={() => setActiveTab("generate")}
              className={cn(
                "px-6 py-3 font-medium transition-colors border-b-2",
                activeTab === "generate"
                  ? "border-primary text-primary"
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
                  ? "border-primary text-primary"
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
                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Selected Context ({selectedText.length} characters)
                  </h3>
                  <p className="text-foreground leading-relaxed max-h-24 overflow-auto bg-background p-3 rounded-xl border text-sm">
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
                      disabled={type.requiresContext && !selectedText}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all duration-200",
                        selectedType === type.key
                          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-muted/30",
                        type.requiresContext && !selectedText && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                            selectedType === type.key
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {type.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground mb-1">
                            {type.name}
                            {type.requiresContext && !selectedText && (
                              <span className="text-xs text-muted-foreground ml-1">(needs text)</span>
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block font-medium text-foreground">
                  {selectedType === "new" ? "Content Prompt" : "Instructions"}
                  {(selectedType === "new" || selectedType === "brainstorm" || selectedType === "outline") && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                  {(selectedType === "continue" || selectedType === "expand" || selectedType === "summarize") && (
                    <span className="text-muted-foreground ml-1 text-sm">(optional)</span>
                  )}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={getPromptPlaceholder()}
                  className="w-full h-28 p-3 rounded-xl border border-border bg-background resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  {selectedType === "new" 
                    ? "Describe the content you want to create"
                    : selectedType === "continue"
                    ? "Leave empty for natural continuation, or provide specific instructions"
                    : selectedType === "expand"
                    ? "Leave empty for general expansion, or specify what to focus on"
                    : selectedType === "summarize"
                    ? "Leave empty for a general summary, or specify the focus"
                    : "Provide specific instructions for how to work with your selected text"
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block font-medium text-foreground">
                    Tone <span className="text-destructive ml-1">*</span>
                  </label>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    {tones.map((tone) => (
                      <option key={tone.key} value={tone.key}>
                        {tone.name} - {tone.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block font-medium text-foreground">
                    Length <span className="text-destructive ml-1">*</span>
                  </label>
                  <select
                    value={selectedLength}
                    onChange={(e) => setSelectedLength(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                    disabled={
                      isLoading || 
                      !selectedTone || 
                      !selectedLength ||
                      // Only require prompt for new, brainstorm, and outline types
                      ((selectedType === "new" || selectedType === "brainstorm" || selectedType === "outline") && !prompt.trim()) ||
                      // Require context for context-dependent types
                      ((selectedType === "continue" || selectedType === "expand" || selectedType === "summarize") && !selectedText?.trim())
                    }
                    className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 font-medium shadow-sm"
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
                <div className="flex items-start space-x-3 text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
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
                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-sm transition-colors flex items-center space-x-2 font-medium"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              <div className="bg-muted/20 border border-border rounded-xl p-6 max-h-80 overflow-auto">
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

              {error && (
                <div className="flex items-start space-x-3 text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setActiveTab("generate")}
                  className="px-6 py-3 bg-muted hover:bg-muted/80 rounded-xl transition-colors font-medium"
                >
                  Edit Settings
                </button>
                <button
                  onClick={handleUseContent}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center space-x-2 font-medium shadow-sm"
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