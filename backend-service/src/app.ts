// src/app.ts
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import {getAuth, requireAuth} from "@clerk/express";

import  env  from "./lib/env";
import authRouter from "@/routes/auth";
import blockRouter from "@/routes/blocks";
import pageRouter from "@/routes/pages";
import focusSessions from "@/routes/focusSessions";

const app = express();

// Basic Middleware
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use(cors({
    origin: env.CLIENT_ORIGIN, // e.g. http://localhost:5173
    credentials: true
}));

//api routers
app.use("/api/auth", authRouter);
app.use("/api/pages", pageRouter);
app.use("/api/blocks", blockRouter);
app.use("/api/focus-sessions", focusSessions)


// Optional: health route
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

// Protected route example
app.get("/api/protected", requireAuth(), (req, res) => {
    const user = getAuth(req);
    res.json({ message: "You are authenticated!", user });
});

export default app;
