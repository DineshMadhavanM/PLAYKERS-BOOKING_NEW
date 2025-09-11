import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check if database credentials are available
function hasValidDatabaseCredentials(): boolean {
  return !!(process.env.DATABASE_URL || 
    (process.env.PGHOST && 
     process.env.PGUSER && 
     process.env.PGPASSWORD && 
     process.env.PGDATABASE && 
     process.env.PGPORT &&
     process.env.PGHOST !== "" &&
     process.env.PGUSER !== ""));
}

// Build DATABASE_URL from individual PG variables if not directly available
function getDatabaseUrl(): string | null {
  // Debug: log available environment variables
  console.log("🔍 Available environment variables:");
  console.log("DATABASE_URL type:", typeof process.env.DATABASE_URL, "value:", JSON.stringify(process.env.DATABASE_URL));
  console.log("PGHOST type:", typeof process.env.PGHOST, "value:", JSON.stringify(process.env.PGHOST));
  console.log("PGUSER type:", typeof process.env.PGUSER, "value:", JSON.stringify(process.env.PGUSER));
  console.log("PGDATABASE type:", typeof process.env.PGDATABASE, "value:", JSON.stringify(process.env.PGDATABASE));
  console.log("PGPORT type:", typeof process.env.PGPORT, "value:", JSON.stringify(process.env.PGPORT));
  console.log("PGPASSWORD type:", typeof process.env.PGPASSWORD, "length:", process.env.PGPASSWORD?.length || 0);

  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== "") {
    console.log("✅ Using DATABASE_URL");
    return process.env.DATABASE_URL;
  }

  // Fallback: build URL from individual PG variables
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
  
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE && PGPORT && 
      PGHOST !== "" && PGUSER !== "" && PGPASSWORD !== "") {
    const url = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
    console.log("✅ Built DATABASE_URL from PG variables");
    return url;
  }

  console.error("❌ Database environment variables are empty. This is likely a Replit configuration issue.");
  console.error("🔧 Troubleshooting steps:");
  console.error("   1. Check that PostgreSQL database is properly provisioned in Replit");
  console.error("   2. Ensure database credentials are properly set in Secrets");
  console.error("   3. Restart the workflow to refresh environment variables");
  
  console.warn("⚠️  No database connection will be made. Using memory-only storage.");
  console.warn("⚠️  Configure database secrets in Replit for full functionality!");
  
  return null;
}

const databaseUrl = getDatabaseUrl();

export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
export const db = pool ? drizzle({ client: pool, schema }) : null;