import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';

const password = 'Oussamabiat2026**';
const projectRef = 'qllvzvejicszsqzglhdq';
const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    console.log("🔗 Connecting to Supabase database...");
    await client.connect();
    
    console.log("📖 Reading schema file...");
    const schemaSql = fs.readFileSync(path.resolve('supabase_schema.sql'), 'utf-8');
    
    console.log("🚀 Executing SQL migration...");
    await client.query(schemaSql);
    
    console.log("✅ SQL Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

runMigration();
