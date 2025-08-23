"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const prisma_1 = require("@/lib/prisma");
class UserService {
    static async syncUser(clerkId, email, name) {
        return prisma_1.prisma.user.upsert({
            where: { clerkId },
            update: { email, name },
            create: { clerkId, email, name },
        });
    }
}
exports.UserService = UserService;
