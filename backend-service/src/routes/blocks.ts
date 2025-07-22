import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { validateBody } from "@/middleware/validate";
import {createBlockSchema, updateBlockSchema} from "@/schemas/block";
import { prisma } from "@/lib/prisma";

const router = Router();
// POST /api/blocks
router.post("/", requireAuth(), validateBody(createBlockSchema), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId || undefined;

        const user = await prisma.user.findUnique({
            where: { clerkId: clerkUserId },
        });

        if (!user) return res.status(404).json({ error: "User not found" });
        // console.log(req)
        const { pageId, type, content, metadata, position } = (req as any).validated;

        const newBlock = await prisma.block.create({
            data: {
                type,
                content: content || "",
                metadata: metadata || {},
                position: position || 0,
                pageId,
            },
        });

        res.status(201).json(newBlock);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create block" });
    }
});



//PATCH /api/blocks/:id
router.patch("/:id", requireAuth(), validateBody(updateBlockSchema), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId || undefined;
        const { id } = req.params || undefined;
        // console.log(req.body)
        const { type, content, metadata, position } = (req as any).validated;

        const updatedBlock = await prisma.block.update({
            where: { id },
            data: {
                type,
                content: content || "",
                metadata: metadata || {},
                position: position || 0,
            }
            });
        if (!updatedBlock) {
            return res.status(404).json({ error: "Block not found" });
        }
        res.status(200).json(updatedBlock);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update block" });
        }
    });

// GET /api/pages/:id/blocks
// Fix the route handler
router.get("/pages/:id", requireAuth(), async (req, res) => {
    try {
        const clerkUserId = getAuth(req)?.userId;
        const { id: pageId } = req.params;

        if (!clerkUserId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        console.log("Page ID:", pageId);
        console.log("Clerk User ID:", clerkUserId);

        const user = await prisma.user.findUnique({
            where: { clerkId: clerkUserId },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const page = await prisma.page.findUnique({
            where: { id: pageId },
        });

        if (!page || page.createdById !== user.id) {
            return res.status(404).json({ error: "Page not found or access denied" });
        }

        const blocks = await prisma.block.findMany({
            where: { pageId },
            orderBy: { position: "asc" },
        });

        res.status(200).json(blocks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch blocks" });
    }
});



const blockRouter = router

export default blockRouter;
