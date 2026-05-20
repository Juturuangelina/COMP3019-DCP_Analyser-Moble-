import { PrismaClient } from "@prisma/client";
import { env } from "@repo/env/web";
export const createClient = () => {
    if (globalThis.prisma) {
        return globalThis.prisma;
    }
    const URL = env.DATABASE_URL;
    const prisma = new PrismaClient({
        datasourceUrl: URL,
    });
    console.log("Connected to database");
    console.log(URL);
    globalThis.prisma = prisma;
    return prisma;
};
export const client = {
    get db() {
        return createClient();
    },
};
