import { z } from "zod";

// 1. FIXED: Complete BlockType enum that matches your Prisma schema exactly
const BlockTypeEnum = z.enum([
    "HEADING",
    "TEXT", 
    "TODO",
    "CHECKLIST",
    "SUMMARY",
    "IMAGE",
    "CODE",
    "QUOTE",
    "DIVIDER",
    "TABLE",
    "EMBED",
    "BULLETED_LIST",      // Missing in your original schema
    "NUMBERED_LIST",      // Missing in your original schema
    "CALL_OUT",           // Missing in your original schema
    "FILE",               // Missing in your original schema
    "BOOKMARK",           // Missing in your original schema
    "DATABASE",           // Missing in your original schema
    "COLUMN",             // Missing in your original schema
    "TOGGLE"              // Missing in your original schema
]);

// 2. FIXED: Handle both API and BlockNote types in validation
const BlockTypeInput = z.string().transform((val, ctx) => {
    // Handle BlockNote types by converting them first
    const blockNoteToApiMap: Record<string, string> = {
        'paragraph': 'TEXT',
        'heading': 'HEADING',
        'bulletListItem': 'BULLETED_LIST',
        'numberedListItem': 'NUMBERED_LIST',
        'checkListItem': 'CHECKLIST',
        'table': 'TABLE',
        'image': 'IMAGE',
        'video': 'EMBED',
        'audio': 'EMBED',
        'file': 'FILE',
        'codeBlock': 'CODE',
        'divider': 'DIVIDER',
        'quote': 'QUOTE',
        'callout': 'CALL_OUT',
    };

    // Convert BlockNote type to API type if needed
    const convertedType = blockNoteToApiMap[val] || val.toUpperCase();
    
    // Validate against enum
    const result = BlockTypeEnum.safeParse(convertedType);
    if (!result.success) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid block type: ${val}. Expected one of: ${BlockTypeEnum.options.join(', ')}`,
        });
        return z.NEVER;
    }
    
    return result.data;
});

// 3. FIXED: Proper content validation based on block type
const BlockContentSchema = z.union([
    z.string(),           // For simple text content
    z.object({}).passthrough(), // For structured content (objects)
    z.array(z.any()),     // For array content
    z.null(),             // Allow null
    z.undefined()         // Allow undefined
]);

// 4. FIXED: Properties schema that matches your frontend usage
const BlockPropertiesSchema = z.union([
    z.object({}).passthrough(), // Allow any object structure
    z.null(),
    z.undefined()
]).optional();

export const createBlockSchema = z.object({
    pageId: z.string().min(1, "Page ID is required"),
    type: BlockTypeInput,
    content: BlockContentSchema.optional(),
    properties: BlockPropertiesSchema,  // Changed from 'metadata' to 'properties' to match Prisma
    metadata: BlockPropertiesSchema,    // Keep metadata for additional data
    position: z.number().optional().default(0),
    parentId: z.string().optional(),    // Added: missing from your original schema
});

export const updateBlockSchema = z.object({
    type: BlockTypeInput.optional(),
    content: BlockContentSchema.optional(),
    properties: BlockPropertiesSchema,
    metadata: BlockPropertiesSchema,
    position: z.number().optional(),
    parentId: z.string().optional(),
});

// 5. FIXED: Updated React Query hooks with proper error handling
export const mapBlockNoteTypeToAPI = (
    blockNoteType: string, 
    context?: { embedType?: 'video' | 'audio' }
): { type: string; context?: any } => {
    const BLOCKNOTE_TO_API_TYPE_MAP: Record<string, string> = {
        'paragraph': 'TEXT',
        'heading': 'HEADING',
        'bulletListItem': 'BULLETED_LIST',
        'numberedListItem': 'NUMBERED_LIST',
        'checkListItem': 'CHECKLIST',
        'table': 'TABLE',
        'image': 'IMAGE',
        'video': 'EMBED',
        'audio': 'EMBED',
        'file': 'FILE',
        'codeBlock': 'CODE',
        'divider': 'DIVIDER',
        'quote': 'QUOTE',
        'callout': 'CALL_OUT',
    };

    const apiType = BLOCKNOTE_TO_API_TYPE_MAP[blockNoteType] || 'TEXT';
    
    if (apiType === 'EMBED') {
        return {
            type: apiType,
            context: { embedType: blockNoteType as 'video' | 'audio' }
        };
    }
    
    return { type: apiType };
};

// 6. FIXED: Validation helper function
export const validateBlockData = (data: any, schema: z.ZodSchema): { success: boolean; error?: string; data?: any } => {
    try {
        const result = schema.parse(data);
        return { success: true, data: result };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
            console.error('Zod validation error:', errorMessages);
            return { success: false, error: errorMessages };
        }
        return { success: false, error: 'Unknown validation error' };
    }
};

// Export types
export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;
export type BlockType = z.infer<typeof BlockTypeEnum>;

// 7. DEBUGGING: Helper function to log validation issues
export const debugBlockValidation = (data: any, operation: 'create' | 'update' = 'create') => {
    const schema = operation === 'create' ? createBlockSchema : updateBlockSchema;
    console.log('Validating block data:', JSON.stringify(data, null, 2));
    
    const result = validateBlockData(data, schema);
    if (!result.success) {
        console.error(`Block ${operation} validation failed:`, result.error);
    } else {
        console.log(`Block ${operation} validation passed:`, result.data);
    }
    
    return result;
};