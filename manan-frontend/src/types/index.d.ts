// src/types/index.d.ts

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export type ID = string;
export type Timestamp = string;
export type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue };

export interface BaseEntity {
    id: ID;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
    id: string;
    clerkId: string;
    email: string;
    name?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserProfile extends User {
    pagesCount: number;
    favoritePages: Page[];
}

// ============================================================================
// PAGE TYPES
// ============================================================================

export interface Page {
    id: string;
    title: string;
    slug?: string | null;
    icon?: string | null;
    coverImage?: string | null;
    isPublished: boolean;
    isArchived: boolean;
    isFavorite: boolean;
    parentId?: string | null;
    position: number;
    workspaceId: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
}

export interface CreatePageInput {
    title: string;
    parentId?: string | null;
    slug?: string | null;
    icon?: string | null;
    coverImage?: string | null;
    isPublished?: boolean;
    workspaceId?: string;
}

export interface UpdatePageInput {
    title?: string;
    parentId?: string | null;
    slug?: string | null;
    icon?: string | null;
    coverImage?: string | null;
    isPublished?: boolean;
    isArchived?: boolean;
    isFavorite?: boolean;
    workspaceId?: string;
}

export interface PageWithChildren extends Page {
    children?: PageWithChildren[];
}

// ============================================================================
// BLOCK TYPES
// ============================================================================

export type BlockType =
    | "TEXT"
    | "HEADING"
    | "TODO"
    | "CHECKLIST"
    | "SUMMARY"
    | "IMAGE"
    | "CODE"
    | "QUOTE"
    | "DIVIDER"
    | "TABLE"
    | "EMBED"
    | "BULLETED_LIST"
    | "NUMBERED_LIST"
    | "CALL_OUT";

export interface Block {
    id: string;
    type: BlockType;
    content?: any; // JSON content
    properties?: any; // JSON properties
    metadata?: any; // JSON metadata
    position: number;
    parentId?: string | null;
    pageId: string;
    createdAt: string;
    updatedAt: string;
    version: number;
}

export interface CreateBlockInput {
    pageId: string;
    type: BlockType;
    content?: any;
    properties?: any;
    metadata?: any;
    position?: number;
    parentId?: string | null;
}

export interface UpdateBlockInput {
    type?: BlockType;
    content?: any;
    properties?: any;
    metadata?: any;
    position?: number;
    parentId?: string | null;
}

export interface BlockWithChildren extends Block {
    children?: BlockWithChildren[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
    data: T;
    message?: string;
    status: number;
}

export interface ApiError {
    error: string;
    message?: string;
    statusCode: number;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface PageListResponse {
    data: Page[];
    total: number;
    page: number;
    limit: number;
}

export interface PageDetailResponse {
    data: Page;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface FormState<T> {
    data: T;
    errors: Partial<Record<keyof T, string>>;
    isSubmitting: boolean;
    isValid: boolean;
}

export interface QueryState<T> {
    data?: T;
    isLoading: boolean;
    error?: string;
    refetch: () => void;
}

// ============================================================================
// LINK TYPES (PageLink model)
// ============================================================================

export type LinkType = "REFERENCE" | "BACKLINK" | "EMBED" | "ALIAS";

export interface PageLink {
    id: string;
    sourceId: string;
    targetId: string;
    linkText?: string | null;
    linkType: LinkType;
    createdAt: string;
    createdById: string;
}

export interface CreatePageLinkInput {
    sourceId: string;
    targetId: string;
    linkText?: string;
    linkType?: LinkType;
}

// ============================================================================
// FOCUS SESSION TYPES
// ============================================================================

export interface FocusSession {
    id: string;
    userId: string;
    pageId?: string | null;
    duration: number; // in minutes
    startTime: string;
    endTime?: string | null;
    isActive: boolean;
    notes?: string | null;
}

export interface CreateFocusSessionInput {
    pageId?: string | null;
    duration: number;
    notes?: string;
}
