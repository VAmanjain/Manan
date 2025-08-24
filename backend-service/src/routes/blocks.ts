import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { validateBody } from "@/middleware/validate";
import { createBlockSchema, updateBlockSchema } from "@/schemas/block";
import { prisma } from "@/lib/prisma";

const router = Router();

// POST /api/blocks - Create a new block (with ownership check)
router.post("/", requireAuth(), validateBody(createBlockSchema), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId;
        if (!clerkUserId) return res.status(401).json({ error: "Authentication required" });

        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { pageId, type, content, metadata, position, properties } = (req as any).validated;

        // Check if user owns the page
        const page = await prisma.page.findUnique({ where: { id: pageId } });
        if (!page || page.createdById !== user.id) {
            return res.status(403).json({ error: "Access denied: You do not own this page" });
        }

        const newBlock = await prisma.block.create({
            data: {
                type,
                content: content ?? null,  // Use null for Json? instead of string
                metadata: metadata ?? null,
                position: position ?? 0,
                properties: properties ?? {},          // Initialize properties as an empty object
                pageId,
            },
        });

        res.status(201).json(newBlock);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create block" });
    }
});

// PATCH /api/blocks/:id - Update a block (with ownership check and proper error handling)
router.patch("/:id", requireAuth(), validateBody(updateBlockSchema), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId;
        if (!clerkUserId) return res.status(401).json({ error: "Authentication required" });

        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { id } = req.params;
        const { type, content, metadata, position, properties } = (req as any).validated;

        // Fetch the block and check ownership via its page
        const block = await prisma.block.findUnique({ where: { id }, include: { page: true } });
        if (!block || block.page.createdById !== user.id) {
            return res.status(403).json({ error: "Access denied: Block not found or you do not own it" });
        }

        const updatedBlock = await prisma.block.update({
            where: { id },
            data: {
                type,
                content: content ?? null,
                metadata: metadata ?? null,
                position: position ?? 0,
                properties: properties ?? {},
            },
        });

        res.status(200).json(updatedBlock);
    } catch (err: any) {
        console.error(err);
        if (err.code === 'P2025') {  // Prisma error code for record not found
            return res.status(404).json({ error: "Block not found" });
        }
        res.status(500).json({ error: "Failed to update block" });
    }
});

// GET /api/pages/:id/blocks - Fetch blocks for a page (fixed path and handler)
router.get("/:pageId/blocks", requireAuth(), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId;
        if (!clerkUserId) return res.status(401).json({ error: "Authentication required" });

        const { pageId } = req.params;

        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const page = await prisma.page.findUnique({ where: { id: pageId } });
        if (!page || page.createdById !== user.id) {
            return res.status(403).json({ error: "Page not found or access denied" });
        }

        const blocks = await prisma.block.findMany({
            where: { pageId },
            orderBy: { position: "asc" },
        });
        // await console.log(blocks);
        res.status(200).json(blocks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch blocks" });
    }
});

router.delete("/:id", requireAuth(), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId;
        if (!clerkUserId) return res.status(401).json({ error: "Authentication required" });
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) return res.status(404).json({ error: "User not found" });
        const block = await prisma.block.findUnique({ where: { id } });
        // if (!block || block.page.createdById !== user.id) {
        //     return res.status(403).json({ error: "Access denied: Block not found or you do not own it" });
        // }
        await prisma.block.delete({ where: { id } });
        res.status(204).json({ message: "Block deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete block" });
    }
});

const blockRouter = router;
export default blockRouter;
