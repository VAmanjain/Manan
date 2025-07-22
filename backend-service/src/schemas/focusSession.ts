import { z } from "zod";

// Starting a session
export const startFocusSessionSchema = z.object({
    pageId: z.string().optional(), // optional: user may just want to focus, not on a page
    duration: z.number().min(1),   // in minutes
});

// Ending/updating a session
export const endFocusSessionSchema = z.object({
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
});

export type StartFocusSessionInput = z.infer<typeof startFocusSessionSchema>;
