import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
});

// Static files (built React app)
app.use(express.static(path.join(__dirname, 'dist')));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: true });
  } catch {
    res.json({ status: 'ok', db: false });
  }
});

// ============================================================
// AUTH
// ============================================================
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND password = $2 AND active = true',
      [username, password]
    );
    if (!rows.length) return res.status(401).json({ error: 'Identifiants invalides' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// PROJECTS
// ============================================================
app.get('/api/projects', async (req, res) => {
  try {
    const { rows: projects } = await pool.query('SELECT * FROM projects ORDER BY id');
    for (const p of projects) {
      const { rows: lines } = await pool.query('SELECT * FROM lines WHERE project_id = $1 ORDER BY id', [p.id]);
      for (const l of lines) {
        const { rows: machines } = await pool.query('SELECT * FROM machines WHERE line_id = $1 ORDER BY id', [l.id]);
        l.machines = machines;
      }
      p.lines = lines;
    }
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// CHECKLIST
// ============================================================
app.get('/api/checklist', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM checklists LIMIT 1');
    if (!rows.length) return res.json(null);
    const item = rows[0];
    res.json({
      title: item.title,
      header_fields: item.header_fields,
      items: item.items,
      action_fields: item.action_fields,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// SETTINGS
// ============================================================
app.get('/api/settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings WHERE key = $1', ['main']);
    res.json(rows.length ? rows[0].value : {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      ['main', JSON.stringify(req.body)]
    );
    res.json(req.body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// USERS
// ============================================================
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, password, display_name, role, active FROM users ORDER BY id');
    res.json(rows.map(u => ({ ...u, displayName: u.display_name })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users', async (req, res) => {
  const u = req.body;
  try {
    await pool.query(
      `INSERT INTO users (id, username, password, display_name, role, active) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET username=$2, password=$3, display_name=$4, role=$5, active=$6`,
      [u.id, u.username, u.password, u.displayName, u.role, u.active !== false]
    );
    res.json(u);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// PLANNING
// ============================================================
app.get('/api/planning', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM planning ORDER BY date, id');
    res.json(rows.map(p => ({
      ...p,
      technicianId: p.technician_id,
      projectId: p.project_id,
      lineId: p.line_id,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/planning', async (req, res) => {
  const entries = Array.isArray(req.body) ? req.body : [req.body];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Clear existing only if replacement
    if (entries.length > 10) await client.query('DELETE FROM planning');
    for (const e of entries) {
      await client.query(
        `INSERT INTO planning (id, date, technician_id, project_id, line_id, status, unplanned) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET date=$2, technician_id=$3, project_id=$4, line_id=$5, status=$6, unplanned=$7`,
        [e.id, e.date, e.technicianId || e.technician_id, e.projectId || e.project_id, e.lineId || e.line_id, e.status || 'todo', e.unplanned || false]
      );
    }
    await client.query('COMMIT');
    res.json(entries);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.delete('/api/planning', async (req, res) => {
  try {
    await pool.query('DELETE FROM planning');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// AUDITS
// ============================================================
app.get('/api/audits', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM audits ORDER BY created_at DESC');
    res.json(rows.map(a => ({
      ...a,
      projectId: a.project_id, projectName: a.project_name,
      lineId: a.line_id, lineName: a.line_name,
      machineIssues: a.machine_issues, technicianId: a.technician_id, planId: a.plan_id,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/audits', async (req, res) => {
  const audits = Array.isArray(req.body) ? req.body : [req.body];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const a of audits) {
      await client.query(
        `INSERT INTO audits (id, plan_id, date, technician_id, auditeur, superviseur, gap_leader,
          project_id, project_name, line_id, line_name, machine_issues, answers, actions, score, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO UPDATE SET
          plan_id=$2, date=$3, technician_id=$4, auditeur=$5, superviseur=$6, gap_leader=$7,
          project_id=$8, project_name=$9, line_id=$10, line_name=$11, machine_issues=$12, answers=$13, actions=$14, score=$15, status=$16`,
        [a.id, a.planId || null, a.date, a.technicianId || null, a.auditeur, a.superviseur, a.gapLeader,
          a.projectId, a.projectName, a.lineId, a.lineName,
          JSON.stringify(a.machineIssues || []), JSON.stringify(a.answers || {}), JSON.stringify(a.actions || []),
          a.score || 0, a.status || 'draft']
      );
    }
    await client.query('COMMIT');
    res.json(audits);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.delete('/api/audits/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM audits WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/audits', async (req, res) => {
  try {
    await pool.query('DELETE FROM audits');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// NOTIFICATIONS
// ============================================================
app.get('/api/notifications', async (req, res) => {
  const { userId } = req.query;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  const n = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,false,NOW()) RETURNING *`,
      [n.id || `N${Date.now().toString(36)}`, n.user_id || n.userId, n.type || 'info', n.title, n.message, n.link]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/notifications/read-all', async (req, res) => {
  const { userId } = req.query;
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// ACTIONS — update status within an audit
// ============================================================
app.patch('/api/audits/:id/actions/:actionIdx', async (req, res) => {
  const { status } = req.body;
  try {
    const { rows } = await pool.query('SELECT actions FROM audits WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Audit not found' });
    const actions = rows[0].actions || [];
    if (actions[req.params.actionIdx]) {
      actions[req.params.actionIdx].act = status;
    }
    await pool.query('UPDATE audits SET actions = $2 WHERE id = $1', [req.params.id, JSON.stringify(actions)]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SPA fallback — serve index.html for all non-API routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
