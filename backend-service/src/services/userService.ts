import { prisma } from '@/lib/prisma';

export class UserService {
    static async syncUser(clerkId: string, email: string, name?: string) {
        return prisma.user.upsert({
            where: { clerkId },
            update: { email, name },
            create: { clerkId, email, name },
        });
    }
}
