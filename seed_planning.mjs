import pg from 'pg';
import fs from 'node:fs';

const { Client } = pg;

const client = new Client({
    connectionString: 'postgresql://postgres:CZeSHKOIpDMpDdEvFsYXFIewCANuYrau@thomas.proxy.rlwy.net:36925/railway',
    ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('Connected');

const planning = JSON.parse(fs.readFileSync('./src/data/planning.json', 'utf8'));

// Batch insert — 50 rows per statement
const BATCH = 50;
for (let i = 0; i < planning.length; i += BATCH) {
    const batch = planning.slice(i, i + BATCH);
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const e of batch) {
        values.push(e.id, e.date, e.technicianId, e.projectId, e.lineId, e.status || 'todo', e.unplanned || false);
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6})`);
        idx += 7;
    }
    await client.query(
        `INSERT INTO planning (id,date,technician_id,project_id,line_id,status,unplanned) VALUES ${placeholders.join(',')} ON CONFLICT (id) DO NOTHING`,
        values
    );
    const done = Math.min(i + BATCH, planning.length);
    if (done % 300 === 0 || done === planning.length) console.log(`planning: ${done}/${planning.length}`);
}

console.log('planning:', planning.length);

// Settings
await client.query(
    'INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING',
    ['main', JSON.stringify({ planningYear: 2026, planningStartISO: '2026-05-04', workingDays: [1,2,3,4,5], started: true, companyName: 'Audit TPM' })]
);
console.log('settings');

await client.end();
console.log('DONE');
