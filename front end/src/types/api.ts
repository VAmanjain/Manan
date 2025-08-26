// User related types
export interface User {
  id: string;
  clerkId: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

// Page related types
export interface Page {
  id: string;
  title: string;
  slug?: string;
  icon?: string;
  coverImage?: string;
  isPublished: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  parentId?: string;
  position: number;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreatePageInput {
  title: string;
  parentId?: string;
  slug?: string;
  icon?: string;
  coverImage?: string;
  isPublished?: boolean;
  workspaceId?: string;
}

export interface UpdatePageInput {
  title?: string;
  parentId?: string;
  slug?: string;
  icon?: string;
  coverImage?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  workspaceId?: string;
}

// Block related types
export type BlockType = 
  | 'TEXT'
  | 'HEADING'
  | 'TODO'
  | 'CHECKLIST'
  | 'SUMMARY'
  | 'IMAGE'
  | 'CODE'
  | 'QUOTE'
  | 'DIVIDER'
  | 'TABLE'
  | 'EMBED'
  | 'BULLETED_LIST'
  | 'NUMBERED_LIST'
  | 'CALL_OUT';

export interface Block {
  id: string;
  type: BlockType;
  content?: any; // JSON content
  properties?: any; // JSON properties
  metadata?: any; // JSON metadata
  position: number;
  parentId?: string;
  pageId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateBlockInput {
  pageId: string;
  type: string;
  content?: any;
  metadata?: any;
  position?: number;
  properties: any;
}

export interface UpdateBlockInput {
  type?: string;
  content?: any;
  metadata?: any;
  position?: number;
  properties: any;
}

// Focus Session types
export interface FocusSession {
  id: string;
  userId: string;
  pageId?: string;
  duration: number;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  notes?: string;
}

export interface StartFocusSessionInput {
  pageId?: string;
  duration: number;
}

export interface EndFocusSessionInput {
  notes?: string;
  isActive?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}


export interface RephraseRequest {
  text: string
  style: "formal" | "casual" | "creative" | "concise"
  preserve_meaning?: boolean
  max_tokens?: number
  temperature?: number
}

export interface RephraseResponse {
  original_text: string
  rephrased_text: string
  style: string
  processing_time: number
  tokens_used?: number
}

export interface ContentGenerationResponse {
  generated_content: string
  prompt: string
  type: string
  processing_time: number
  tokens_used?: number
}

export interface ContentGenerationRequest {
  prompt: string
  context?: string
  type: "continue" | "expand" | "new" | "brainstorm" | "outline" | "summarize"
  tone?: "professional" | "casual" | "creative" | "academic" | "persuasive"
  length?: "short" | "medium" | "long"
  max_tokens?: number
  temperature?: number
}