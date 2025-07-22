import { z } from "zod";


const BlockType = z.enum([
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
])

export const createBlockSchema = z.object({
    pageId: z.string().min(1),
    type: z.string().transform(val => val.toUpperCase()).pipe(BlockType) ,
    content: z.string().optional(),
    metadata: z.any().optional(),
    position: z.number().optional(),
});


export const updateBlockSchema = z.object({
    pageId: z.string().min(1).optional(),
    type: z.enum([
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
    ]),
    content: z.string().optional(),
    metadata: z.any().optional(),
    position: z.number().optional(),
    id: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    createdAt: z.date().optional(),
})

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
