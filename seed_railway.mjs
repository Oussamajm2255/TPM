import pg from 'pg';
import fs from 'node:fs';

const { Client } = pg;

const client = new Client({
    connectionString: 'postgresql://postgres:CZeSHKOIpDMpDdEvFsYXFIewCANuYrau@thomas.proxy.rlwy.net:36925/railway',
    ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('Connected');

const users = JSON.parse(fs.readFileSync('./src/data/users.json', 'utf8'));
for (const u of users) {
    await client.query(
        'INSERT INTO users (id,username,password,display_name,role,active) VALUES ($1,$2,$3,$4,$5,$6)',
        [u.id, u.username, u.password, u.displayName, u.role, u.active !== false]
    );
}
console.log('users:', users.length);

const projects = JSON.parse(fs.readFileSync('./src/data/projects.json', 'utf8'));
let lc = 0, mc = 0;
for (const p of projects) {
    await client.query('INSERT INTO projects (id,name) VALUES ($1,$2)', [p.id, p.name]);
    for (const l of p.lines) {
        await client.query('INSERT INTO lines (id,project_id,name) VALUES ($1,$2,$3)', [l.id, p.id, l.name]);
        lc++;
        for (const m of l.machines) {
            await client.query('INSERT INTO machines (id,line_id,code) VALUES ($1,$2,$3)', [m.id, l.id, m.code]);
            mc++;
        }
    }
}
console.log('projects:', projects.length, 'lines:', lc, 'machines:', mc);

const checklist = JSON.parse(fs.readFileSync('./src/data/checklist.json', 'utf8'));
await client.query(
    'INSERT INTO checklists (title,header_fields,items,action_fields) VALUES ($1,$2,$3,$4)',
    [checklist.title, JSON.stringify(checklist.header_fields), JSON.stringify(checklist.items), JSON.stringify(checklist.action_fields)]
);
console.log('checklist');

const planning = JSON.parse(fs.readFileSync('./src/data/planning.json', 'utf8'));
let pc = 0;
for (const e of planning) {
    await client.query(
        'INSERT INTO planning (id,date,technician_id,project_id,line_id,status,unplanned) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [e.id, e.date, e.technicianId, e.projectId, e.lineId, e.status || 'todo', e.unplanned || false]
    );
    pc++;
    if (pc % 300 === 0) console.log('planning:', pc, '/', planning.length);
}
console.log('planning:', planning.length);

await client.query(
    'INSERT INTO settings (key,value) VALUES ($1,$2)',
    ['main', JSON.stringify({ planningYear: 2026, planningStartISO: '2026-05-04', workingDays: [1,2,3,4,5], started: true, companyName: 'Audit TPM' })]
);
console.log('settings');

await client.end();
console.log('DONE');
