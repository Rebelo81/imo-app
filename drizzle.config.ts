import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Configuração temporária para SQLite durante desenvolvimento
const isSQLite = process.env.DATABASE_URL?.startsWith('file:');

export default defineConfig({
  out: "./migrations",
  schema: isSQLite ? "./shared/schema-sqlite.ts" : "./shared/schema.ts",
  dialect: isSQLite ? "sqlite" : "postgresql",
  dbCredentials: isSQLite ? {
    url: process.env.DATABASE_URL,
  } : {
    url: process.env.DATABASE_URL,
  },
});
