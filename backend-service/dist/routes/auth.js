"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("@clerk/express");
const getOrCreateUser_1 = require("@/lib/getOrCreateUser");
const express_2 = require("express");
const router = (0, express_2.Router)();
router.get("/me", (0, express_1.requireAuth)(), async (req, res) => {
    try {
        const user = await (0, getOrCreateUser_1.getOrCreateUser)(req);
        res.json(user);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Auth error" });
    }
});
const Authrouter = router;
exports.default = Authrouter;
