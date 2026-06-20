import pg from 'pg';
const c = new pg.Client({connectionString:'postgresql://postgres:CZeSHKOIpDMpDdEvFsYXFIewCANuYrau@thomas.proxy.rlwy.net:36925/railway', ssl:{rejectUnauthorized:false}});
await c.connect();
const r = await c.query(`SELECT 'users' as tbl, count(*) FROM users UNION ALL SELECT 'projects', count(*) FROM projects UNION ALL SELECT 'lines', count(*) FROM lines UNION ALL SELECT 'machines', count(*) FROM machines UNION ALL SELECT 'checklists', count(*) FROM checklists UNION ALL SELECT 'planning', count(*) FROM planning UNION ALL SELECT 'settings', count(*) FROM settings UNION ALL SELECT 'audits', count(*) FROM audits`);
r.rows.forEach(x => console.log(x.tbl.padEnd(12), x.count));
await c.end();
