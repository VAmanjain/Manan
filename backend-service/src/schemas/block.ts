import { z } from "zod";

// Shared BlockType enum for consistency (matches Prisma's uppercase enum)
const BlockTypeEnum = z.enum([
    "TEXT",
    "HEADING",
    "TODO",
    "CHECKLIST",
    "SUMMARY",
    "IMAGE",
    "CODE",
    "QUOTE",
    "DIVIDER",
    "TABLE",
    "EMBED",
    // Add more if you've expanded the Prisma enum
]);

export const createBlockSchema = z.object({
    pageId: z.string().min(1),  // Required for creation
    type: z.string().transform(val => val.toUpperCase()).pipe(BlockTypeEnum),  // Transform to uppercase and validate against enum
    content: z.unknown().optional(),  // Flexible for Json? in Prisma (e.g., string, object, array)
    metadata: z.any().optional(),     // Flexible for Json? (e.g., additional props)
    position: z.number().optional(),
});

export const updateBlockSchema = z.object({
    type: z.string().transform(val => val.toUpperCase()).pipe(BlockTypeEnum).optional(),  // Optional, with same transform/enum
    content: z.unknown().optional(),  // Flexible for updates
    metadata: z.any().optional(),
    position: z.number().optional(),
    // Removed: id (from params), pageId (not updatable), status (not in model), createdAt (auto-generated)
});

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;
