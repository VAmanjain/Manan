"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    CLIENT_ORIGIN: zod_1.z.string().url(),
    PORT: zod_1.z.coerce.number().min(3000).max(5000),
    NODE_ENV: zod_1.z
        .union([zod_1.z.literal("development"), zod_1.z.literal("production")])
        .default("development"),
});
const env = envSchema.parse(process.env);
exports.default = env;
