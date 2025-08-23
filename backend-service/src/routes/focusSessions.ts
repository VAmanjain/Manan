import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/middleware/validate";
import { startFocusSessionSchema, endFocusSessionSchema } from "@/schemas/focusSession";

const router = Router();

// POST /api/focus-sessions → Start new session
router.post("/", requireAuth(), validateBody(startFocusSessionSchema), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId || undefined;
        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { pageId, duration } = (req as any).validated;

        const newSession = await prisma.focusSession.create({
            data: {
                userId: user.id,
                pageId,
                duration,
                startTime: new Date(),
            },
        });

        res.status(201).json(newSession);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to start session" });
    }
});

// PATCH /api/focus-sessions/:id → End or update session
router.patch("/:id", requireAuth(), validateBody(endFocusSessionSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, isActive } = (req as any).validated;

        const updated = await prisma.focusSession.update({
            where: { id },
            data: {
                endTime: new Date(),
                notes,
                isActive: isActive ?? false,
            },
        });

        res.status(200).json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to end session" });
    }
});

// GET /api/focus-sessions → List all for current user
router.get("/", requireAuth(), async (req, res) => {
    try {
        const clerkUserId = getAuth(req).userId || undefined;
        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });

        if (!user) return res.status(404).json({ error: "User not found" });

        const sessions = await prisma.focusSession.findMany({
            where: { userId: user.id },
            orderBy: { startTime: "desc" },
        });

        res.status(200).json(sessions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
});

const focusSessionsRouter = router;

export default focusSessionsRouter;
