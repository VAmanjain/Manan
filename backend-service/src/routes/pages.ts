import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { prisma } from "@/lib/prisma";
import {createPageSchema, updatePageSchema} from "@/schemas/page";
import { validateBody } from "@/middleware/validate";

const router = Router();

// GET /api/pages/user → Get all root pages for authenticated user
router.get("/user", requireAuth(), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId;
        if (!clerkUserId) return res.status(401).json({ error: "Authentication required" });

        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const pages = await prisma.page.findMany({
            select: { id: true, title: true, icon: true, createdAt: true, updatedAt: true, parentId: true, coverImage: true },
            where: {
                createdById: user.id,
                parentId: null, // only root pages
            },
            orderBy: { createdAt: "desc" },
        });

        res.status(200).json(pages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch pages" });
    }
});

// GET /api/pages/:id → Get a single page by ID
router.get("/:id", requireAuth(), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId;
        const { id } = req.params;

        if (!clerkUserId) return res.status(401).json({ error: "Authentication required" });
        if (!id || typeof id !== "string") return res.status(400).json({ error: "Invalid or missing page ID" });

        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Find page without restricting to root only unless desired
        const page = await prisma.page.findUnique({ where: { id } });

        if (!page) return res.status(404).json({ error: "Page not found" });

        if (page.createdById !== user.id) {
            // For better semantics, you can respond 403
            return res.status(403).json({ error: "Access denied to this page" });
        }
        await console.log
        res.status(200).json({ data: page });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch page" });
    }
});


router.delete("/:id", requireAuth(), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId;
        const { id } = req.params;

        if (!clerkUserId) return res.status(401).json({ error: "Authentication required" });

        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const page = await prisma.page.findUnique({ where: { id } });
        if (!page) return res.status(404).json({ error: "Page not found" });

        if (page.createdById !== user.id) {
            return res.status(403).json({ error: "Access denied to this page" });
        }

        await prisma.page.delete({ where: { id } });
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete page" });
    }
});

// GET /api/pages → Get all pages for current user (including all nested)
router.get("/", requireAuth(), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId;
        if (!clerkUserId) return res.status(401).json({ error: "Authentication required" });

        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const pages = await prisma.page.findMany({
            where: { createdById: user.id },
            orderBy: { createdAt: "desc" },
        });

        res.status(200).json(pages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch pages" });
    }
});

// POST /api/pages → Create new page
router.post("/", requireAuth(), validateBody(createPageSchema), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId;
        if (!clerkUserId) return res.status(401).json({ error: "Authentication required" });

        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { title, parentId } = (req as any).validated;

        // If parentId provided, verify it belongs to this user
        if (parentId) {
            const parentPage = await prisma.page.findUnique({ where: { id: parentId } });
            if (!parentPage || parentPage.createdById !== user.id) {
                return res.status(403).json({ error: "Invalid parent page or access denied" });
            }
        }

        const newPage = await prisma.page.create({
            data: {
                title,
                parentId: parentId ?? null, // Explicit null if undefined
                createdById: user.id,
                workspaceId: "default", // TODO: replace with real workspace logic later
            },
        });

        res.status(201).json(newPage);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create page" });
    }
});

// Optional: PATCH /api/pages/:id → Update page attributes like title, parentId

router.patch("/:id", requireAuth(), validateBody(updatePageSchema), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId;
        const { id } = req.params;
        const validatedData = (req as any).validated;

        if (!clerkUserId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        // Find user by Clerk ID
        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Find the page and verify ownership
        const existingPage = await prisma.page.findUnique({ where: { id } });
        if (!existingPage) {
            return res.status(404).json({ error: "Page not found" });
        }

        if (existingPage.createdById !== user.id) {
            return res.status(403).json({ error: "Access denied: You do not own this page" });
        }

        // If updating parentId, confirm parent page ownership (if provided)
        if (validatedData.parentId !== undefined && validatedData.parentId !== null) {
            const parentPage = await prisma.page.findUnique({ where: { id: validatedData.parentId } });
            if (!parentPage || parentPage.createdById !== user.id) {
                return res.status(403).json({ error: "Invalid parent page or access denied" });
            }
        }

        // Perform partial update
        const updatedPage = await prisma.page.update({
            where: { id },
            data: {
                ...validatedData,
                parentId: validatedData.parentId === undefined ? existingPage.parentId : validatedData.parentId,
            },
        });

        return res.status(200).json(updatedPage);
    } catch (error) {
        console.error("Failed to update page:", error);
        return res.status(500).json({ error: "Failed to update page" });
    }
});

const pageRouter = router;
export default pageRouter;
