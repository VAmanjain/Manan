import { requireAuth } from "@clerk/express";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import {Router  } from "express";

const router = Router();

router.get("/me", requireAuth(), async (req, res) => {
    try {
        const user = await getOrCreateUser(req);
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Auth error" });
    }
});


const authRouter = router;

export  default  authRouter;