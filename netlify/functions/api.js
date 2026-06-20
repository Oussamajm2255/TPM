import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('URL present:', !!supabaseUrl);
  console.error('Key present:', !!supabaseKey);
}

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const checkConfig = (req, res, next) => {
  if (!supabase) {
    return res.status(500).json({ 
      error: 'Backend configuration error (Supabase keys missing)',
      details: 'Check Netlify environment variables.'
    });
  }
  next();
};

const router = express.Router();
router.use(checkConfig);

// --- Auth Endpoints
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user || user.password_hash !== password) {
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

  const { data: newAudit, error: auditErr } = await supabase
    .from('audits')
    .insert([audit])
    .select()
    .single();

  if (auditErr) return res.status(500).json({ error: auditErr.message });

  const answersToInsert = answers.map(a => ({ ...a, audit_id: newAudit.id }));
  const { error: ansErr } = await supabase
    .from('audit_answers')
    .insert(answersToInsert);

  if (ansErr) return res.status(500).json({ error: ansErr.message });

  res.json(newAudit);
});

// --- Users
router.get('/users', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- Settings
router.get('/settings', async (req, res) => {
  // In our schema, settings might be a simple object or a table
  // For now, return the default structure expected by the frontend
  res.json({
    companyName: 'Audit TPM',
    planningYear: 2026,
    started: true
  });
});


// --- Special Planning Actions
router.post('/planning/regenerate', async (req, res) => {
  // This is a placeholder for the logic in planningService.js refactor
  // In a real app, this would perform the full-year deterministic planning in Node
  res.json({ message: 'Regeneration successful (Stub)' });
});

// Mount router
app.use('/', router);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', config: !!supabase }));

export const handler = serverless(app, {
  basePath: '/.netlify/functions/api'
});
