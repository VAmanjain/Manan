"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/pages.ts
const express_1 = require("express");
const express_2 = require("@clerk/express");
const prisma_1 = require("@/lib/prisma");
const router = (0, express_1.Router)();
// GET /api/pages → Get all pages for current user
router.get("/", (0, express_2.requireAuth)(), async (req, res) => {
    try {
        const clerkUserId = (0, express_2.getAuth)(req).userId || undefined;
        console.info(clerkUserId);
        const user = await prisma_1.prisma.user.findUnique({
            where: { clerkId: clerkUserId },
        });
        console.info(user);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const pages = await prisma_1.prisma.page.findMany({
            where: { createdById: user.id },
            orderBy: { createdAt: "desc" },
        });
        res.json(pages);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch pages" });
    }
});
// POST /api/pages → Create new page
router.post("/", (0, express_2.requireAuth)(), async (req, res) => {
    try {
        const clerkUserId = (0, express_2.getAuth)(req).userId || undefined;
        const { title, parentId } = req.body;
        const user = await prisma_1.prisma.user.findUnique({
            where: { clerkId: clerkUserId },
        });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const newPage = await prisma_1.prisma.page.create({
            data: {
                title,
                parentId,
                createdById: user.id,
                workspaceId: "default", // Placeholder if you haven’t added workspaces yet
            },
        });
        res.status(201).json(newPage);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create page" });
    }
});
// (Optional) GET /api/pages/:id → Get one page
router.get("/:id", (0, express_2.requireAuth)(), async (req, res) => {
    try {
        const clerkUserId = (0, express_2.getAuth)(req).userId || undefined;
        const { id } = req.params;
        const user = await prisma_1.prisma.user.findUnique({
            where: { clerkId: clerkUserId },
        });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const page = await prisma_1.prisma.page.findUnique({
            where: { id },
            include: {
                blocks: true, // Include blocks if needed
            },
        });
        if (!page || page.createdById !== user.id) {
            return res.status(403).json({ error: "Access denied" });
        }
        res.json(page);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch page" });
    }
});
exports.default = router;
