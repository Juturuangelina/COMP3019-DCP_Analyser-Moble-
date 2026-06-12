import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient as createLibSQLClient } from "@libsql/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const createClient = () => {
  if (globalThis.prisma) return globalThis.prisma;

  let prisma: PrismaClient;

  if (process.env.DATABASE_TURSO_DATABASE_URL && process.env.DATABASE_TURSO_AUTH_TOKEN) {
    const turso = createLibSQLClient({
      url: process.env.DATABASE_TURSO_DATABASE_URL,
      authToken: process.env.DATABASE_TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(turso);
    prisma = new PrismaClient({ adapter });
    console.log("Connected to Turso database");
  } else {
    prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
    console.log("Connected to local SQLite:", process.env.DATABASE_URL);
  }

  globalThis.prisma = prisma;
  return prisma;
};

export const client = {
  get db() {
    return createClient();
  },
};
