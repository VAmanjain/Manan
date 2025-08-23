"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_2 = require("@clerk/express");
const env_1 = __importDefault(require("./lib/env"));
const pages_1 = __importDefault(require("@/routes/pages"));
const auth_1 = __importDefault(require("@/routes/auth"));
// your zod-env validated object
const app = (0, express_1.default)();
// Basic Middleware
app.use(express_1.default.json());
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use((0, cors_1.default)({
    origin: env_1.default.CLIENT_ORIGIN, // e.g. http://localhost:5173
    credentials: true
}));
app.use("/api/pages", (0, express_2.requireAuth)(), pages_1.default);
app.use("/api/auth/", auth_1.default);
// Optional: health route
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Protected route example
app.get("/api/protected", (0, express_2.requireAuth)(), (req, res) => {
    const user = req.auth;
    res.json({ message: "You are authenticated!", user });
});
exports.default = app;
