import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';

const password = 'Oussamabiat2026**';
const projectRef = 'qllvzvejicszsqzglhdq';
const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;

async function seed() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("🚀 Starting data seeding via direct PostgreSQL connection...");

    const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve('src/data', file), 'utf-8'));

    const users = readJson('users.json');
    const projects = readJson('projects.json');
    const checklist = readJson('checklist.json');
    const planning = readJson('planning.json');

    // 1. Users
    console.log("Seeding users...");
    for (const u of users) {
      await client.query(
        'INSERT INTO users (id, username, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, display_name = EXCLUDED.display_name, role = EXCLUDED.role',
        [u.id, u.username, u.password, u.displayName, u.role]
      );
    }

    // 2. Projects Structure
    console.log("Seeding projects, lines, machines...");
    for (const p of projects) {
      await client.query('INSERT INTO projects (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name', [p.id, p.name]);
      for (const l of p.lines) {
        await client.query('INSERT INTO lines (id, project_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET project_id = EXCLUDED.project_id, name = EXCLUDED.name', [l.id, p.id, l.name]);
        for (const m of l.machines) {
          await client.query('INSERT INTO machines (id, line_id, code) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET line_id = EXCLUDED.line_id, code = EXCLUDED.code', [m.id, l.id, m.code]);
        }

      }
    }

    // 3. Checklist Items
    console.log("Seeding checklist items...");
    for (const i of checklist.items) {
      await client.query('INSERT INTO checklist_items (id, label, type, weight) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [i.id, i.label, i.type, i.weight]);
    }

    // 4. Planning (Batching for speed)
    console.log("Seeding planning entries (batched)...");
    const chunkSize = 100;
    for (let i = 0; i < planning.length; i += chunkSize) {
      const chunk = planning.slice(i, i + chunkSize);
      const values = [];
      const placeholders = [];
      
      chunk.forEach((p, idx) => {
        const offset = idx * 7;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
        values.push(p.id, p.date, p.technicianId, p.projectId, p.lineId, p.status, p.unplanned || false);
      });

      const sql = `INSERT INTO planning (id, date, technician_id, project_id, line_id, status, unplanned) VALUES ${placeholders.join(',')} ON CONFLICT (id) DO NOTHING`;
      await client.query(sql, values);
    }


    console.log("✅ Seeding complete!");
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  } finally {
    await client.end();
  }
}

seed();
