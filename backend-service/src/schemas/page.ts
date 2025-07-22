// src/schemas/page.ts
import { z } from "zod";

export const createPageSchema = z.object({
    title: z.string().min(1, "Title is required"),
    parentId: z.string().nullable().optional(),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
