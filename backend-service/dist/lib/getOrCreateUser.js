"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateUser = getOrCreateUser;
const prisma_1 = require("@/lib/prisma");
const express_1 = require("@clerk/express");
async function getOrCreateUser(req) {
    const { sessionClaims } = (0, express_1.getAuth)(req);
    console.log(sessionClaims);
    if (!sessionClaims)
        throw new Error("Missing Clerk userId");
    const claims = sessionClaims || {};
    const email = claims.email ??
        "unknown@example.com";
    const name = claims.name ?? null;
    const clerkId = claims.userid ?? null;
    let user = await prisma_1.prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
        user = await prisma_1.prisma.user.create({
            data: {
                clerkId,
                email,
                name,
            },
        });
    }
    return user;
}
