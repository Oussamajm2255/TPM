import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Please provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("🚀 Starting migration to Supabase...");

  const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve('src/data', file), 'utf-8'));

  const users = readJson('users.json');
  const projects = readJson('projects.json');
  const checklist = readJson('checklist.json');
  const planning = readJson('planning.json');

  // 1. Migrate Users
  console.log("Migrating users...");
  const { error: userErr } = await supabase.from('users').upsert(users.map(u => ({
    id: u.id,
    username: u.username,
    password_hash: u.password, // Security: replace with bcrypt.hash in reality
    display_name: u.displayName,
    role: u.role
  })));
  if (userErr) console.error("User Migration Error:", userErr);

  // 2. Migrate Projects, Lines, Machines
  console.log("Migrating projects structure...");
  for (const p of projects) {
    await supabase.from('projects').upsert({ id: p.id, name: p.name });
    for (const l of p.lines) {
      await supabase.from('lines').upsert({ id: l.id, project_id: p.id, name: l.name });
      const machinesToInsert = l.machines.map(m => ({ id: m.id, line_id: l.id, name: m.name }));
      await supabase.from('machines').upsert(machinesToInsert);
    }
  }

  // 3. Migrate Checklist Items
  console.log("Migrating checklist items...");
  const { error: checkErr } = await supabase.from('checklist_items').upsert(checklist.items.map(i => ({
    id: i.id,
    label: i.label,
    type: i.type,
    weight: i.weight
  })));
  if (checkErr) console.error("Checklist Migration Error:", checkErr);

  // 4. Migrate Planning
  console.log("Migrating planning entries...");
  // Planning might be large, insert in chunks
  const chunkSize = 100;
  for (let i = 0; i < planning.length; i += chunkSize) {
    const chunk = planning.slice(i, i + chunkSize).map(p => ({
      id: p.id,
      date: p.date,
      technician_id: p.technicianId,
      project_id: p.projectId,
      line_id: p.lineId,
      status: p.status,
      unplanned: p.unplanned || false
    }));
    await supabase.from('planning').upsert(chunk);
  }

  console.log("✅ Migration complete!");
}

seed().catch(console.error);
