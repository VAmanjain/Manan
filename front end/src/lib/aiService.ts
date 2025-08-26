import type { ContentGenerationRequest, ContentGenerationResponse, RephraseRequest, RephraseResponse } from "@/types/api"

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

  async getStyles(): Promise<{
    styles: Array<{ key: string; name: string; description: string }>
  }> {
    const response = await fetch(`${this.baseURL}/styles`)
    if (!response.ok) {
      return {
        styles: [
          { key: "formal", name: "Formal", description: "Professional tone" },
          { key: "casual", name: "Casual", description: "Conversational tone" },
          {
            key: "creative",
            name: "Creative",
            description: "Expressive style",
          },
          { key: "concise", name: "Concise", description: "Brief and direct" },
        ],
      }
    }
    return response.json()
  }

  async getContentTypes(): Promise<{
    types: Array<{ key: string; name: string; description: string }>
  }> {
    const response = await fetch(`${this.baseURL}/content-types`)
    if (!response.ok) {
      return {
        types: [
          {
            key: "new",
            name: "New Content",
            description: "Create new content",
          },
          {
            key: "continue",
            name: "Continue",
            description: "Continue writing",
          },
          { key: "expand", name: "Expand", description: "Expand ideas" },
        ],
      }
    }
    return response.json()
  }
}

export default AIService