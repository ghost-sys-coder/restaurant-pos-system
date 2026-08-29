import "dotenv/config";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWebSocket } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add the Neon connection string to .env.");
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

neonConfig.webSocketConstructor = ws;

export async function withTransaction<T>(work: (transaction: any) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString });
  const transactionalDb = drizzleWebSocket(pool, { schema });
  try {
    return await transactionalDb.transaction(work);
  } finally {
    await pool.end();
  }
}
