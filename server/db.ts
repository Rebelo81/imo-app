import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgreSQL } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import * as schemaSQLite from '../shared/schema-sqlite.js';
import * as schemaPostgreSQL from '../shared/schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if using SQLite or PostgreSQL
const isSQLite = process.env.DATABASE_URL.startsWith('file:');

let db;

if (isSQLite) {
  // SQLite configuration
  const dbPath = process.env.DATABASE_URL.replace('file:', '');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  
  db = drizzleSQLite(sqlite, { schema: schemaSQLite });
} else {
  // PostgreSQL configuration
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });
  
  db = drizzlePostgreSQL(pool, { schema: schemaPostgreSQL });
}

export { db };
