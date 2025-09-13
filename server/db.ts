import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let db: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;

export function getDb() {
  if (db) return db;
  
  // Try multiple environment variable names with fallbacks
  const url = process.env.DATABASE_URL || 
               process.env.POSTGRES_URL || 
               process.env.NEON_DATABASE_URL;
               
  if (!url) {
    throw new Error(
      "No database connection string found. Please set DATABASE_URL, POSTGRES_URL, or NEON_DATABASE_URL environment variable.",
    );
  }
  
  console.log('🔗 Using database connection from environment variable');
  
  pool = new Pool({ connectionString: url });
  db = drizzle({ client: pool, schema });
  
  return db;
}

// Export db for backward compatibility, but it will be initialized lazily
export { db };