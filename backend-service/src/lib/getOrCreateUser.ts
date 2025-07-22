import { prisma } from "@/lib/prisma";
import type { Request } from "express";
import {getAuth} from "@clerk/express";


export async function getOrCreateUser(req: Request) {


    const {sessionClaims} = getAuth(req);
    console.log(sessionClaims)


    if (!sessionClaims) throw new Error("Missing Clerk userId");

    const claims = sessionClaims || {};

    const email =
        claims.email ??
        "unknown@example.com";
    const name = claims.name ?? null;
    const clerkId = claims.userid ?? null;
    let user = await prisma.user.findUnique({ where: { clerkId } });

    if (!user) {
        user = await prisma.user.create({
            data: {
                clerkId,
                email,
                name,
            },
        });
    }

    return user;
}
