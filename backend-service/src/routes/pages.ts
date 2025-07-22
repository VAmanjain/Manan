// src/routes/pages.ts
import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { prisma } from "@/lib/prisma";
import  { createPageSchema} from "@/schemas/page";
import  {validateBody} from "@/middleware/validate";

const router = Router();
// GET /api/pages/users → Get all pages for a specific user
router.get("/user", requireAuth(), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId || undefined;

        const user = await prisma.user.findUnique({
            where: { clerkId: clerkUserId },
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        const pages = await prisma.page.findMany({
            select: {
                id: true,
                title: true, // 👈 Only id and name
            },
            where: {
                createdById: user.id,
                parentId: null, // 👈 Only root pages
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        res.status(200).json(pages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch pages" });
    }
});

//  GET /api/pages/:id → Get one page
router.get("/:id", requireAuth(), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId || undefined;
        const { id } = req.params ;

        // Basic validation: Ensure id is provided and valid (expand with Zod if needed)
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Invalid or missing page ID" });
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: clerkUserId },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Use findUnique for a single object (returns Page | null)
        const page = await prisma.page.findUnique({
            where: {
                id: id, // Assumes id is unique
                // Include additional filters (remove parentId if you want any page, not just roots)
                createdById: user.id,
                parentId: null, // 👈 Only root pages (remove if not needed)
            },

        });

        if (!page) {
            return res.status(404).json({ error: "Page not found" });
        }

        // Return a single object (not an array)
        res.status(200).json({ data: page });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch page" });
    }
});




// GET /api/pages → Get all pages for current user
router.get("/", requireAuth(), async (req, res) => {
    try {

        const clerkUserId = getAuth(req).userId || undefined;
        console.info(clerkUserId)

        const user = await prisma.user.findUnique({
            where: { clerkId: clerkUserId },
        });
        console.info(user);

        if (!user) return res.status(404).json({ error: "User not found" });

        const pages = await prisma.page.findMany({
            where: { createdById: user.id },
            orderBy: { createdAt: "desc" },
        });



        res.json(pages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch pages" });
    }
});

// POST /api/pages → Create new page
router.post("/", requireAuth(), validateBody(createPageSchema), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId || undefined;

        const user = await prisma.user.findUnique({
            where: { clerkId: clerkUserId },
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        const { title, parentId } = (req as any).validated;

        const newPage = await prisma.page.create({
            data: {
                title,
                parentId,
                createdById: user.id,
                workspaceId: "default", // Placeholder if you haven’t added workspaces yet
            },
        });

        res.status(201).json(newPage);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create page" });
    }
});



const pageRouter = router;

export default pageRouter;
