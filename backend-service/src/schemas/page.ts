import { z } from "zod";

// Shared refinements if needed (e.g., for slug format)
const slugRefinement = (val: string | null | undefined) => {
    if (!val) return true; // Allow null/undefined
    return /^[a-z0-9-]+$/.test(val); // Simple URL-friendly check: lowercase letters, numbers, hyphens
};

export const createPageSchema = z.object({
    title: z.string().min(1, "Title is required"),
    parentId: z.string().uuid({ message: "Invalid parent ID format" }).nullable().optional(), // Optional, nullable, with UUID check
    slug: z.string().nullable().optional().refine(slugRefinement, { message: "Slug must be URL-friendly (lowercase, hyphens)" }), // Optional, for URL refs
    icon: z.string().nullable().optional(), // e.g., emoji or icon ID
    coverImage: z.string().url({ message: "Invalid cover image URL" }).nullable().optional(), // Optional URL validation
    isPublished: z.boolean().optional(), // Defaults to false in Prisma
    workspaceId: z.string().min(1, "Workspace ID is required").optional(), // Optional for now; make required if implementing workspaces
});

export const updatePageSchema = z.object({
    title: z.string().min(1, "Title is required").optional(), // Allow partial updates
    parentId: z.string().uuid({ message: "Invalid parent ID format" }).nullable().optional(),
    slug: z.string().nullable().optional().refine(slugRefinement, { message: "Slug must be URL-friendly" }),
    icon: z.string().nullable().optional(),
    coverImage: z.string().url({ message: "Invalid cover image URL" }).nullable().optional(),
    isPublished: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
    workspaceId: z.string().min(1).optional(), // Rare to update, but allow if needed
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided for update" }); // Prevent empty updates

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
