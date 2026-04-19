import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

const router = express.Router();

// --- Auth Endpoints
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  // For production, we would query the 'users' table and compare password hashes
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user || user.password_hash !== password) { // Simple check for demo
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  res.json({ user });
});

// --- Projects & Lines
router.get('/projects', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*, lines(*, machines(*))');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- Planning
router.get('/planning', async (req, res) => {
  const { data, error } = await supabase
    .from('planning')
    .select('*')
    .order('date', { ascending: true });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- Checklist
router.get('/checklist', async (req, res) => {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ items: data });
});

// --- Audits
router.get('/audits', async (req, res) => {
  const { data, error } = await supabase
    .from('audits')
    .select('*, audit_answers(*)');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/audits', async (req, res) => {
  const { audit, answers } = req.body;
  
  // 1. Insert audit
  const { data: newAudit, error: auditErr } = await supabase
    .from('audits')
    .insert([audit])
    .select()
    .single();

  if (auditErr) return res.status(500).json({ error: auditErr.message });

  // 2. Insert answers
  const answersToInsert = answers.map(a => ({ ...a, audit_id: newAudit.id }));
  const { error: ansErr } = await supabase
    .from('audit_answers')
    .insert(answersToInsert);

  if (ansErr) return res.status(500).json({ error: ansErr.message });

  res.json(newAudit);
});

app.use('/.netlify/functions/api', router);

export const handler = serverless(app);
