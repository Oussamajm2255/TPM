// dataClient — production API client for Railway PostgreSQL backend

const API = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'API error');
  }
  return res.json();
}

export const dataClient = {
  async get(collection) {
    return request(`/${collection}`);
  },

  async set(collection, value) {
    return request(`/${collection}`, {
      method: 'POST',
      body: JSON.stringify(value),
    });
  },

  async patch(collection, updater) {
    const current = await this.get(collection);
    const updated = updater(current);
    return this.set(collection, updated);
  },

  async clear(collection) {
    return request(`/${collection}`, { method: 'DELETE' });
  },

  async reset() {
    console.warn('Reset not available in API mode');
  },
};

// Notifications use their own endpoints
export const supabase = null; // notificationService now uses fetch directly

export function exportDB() {
  return 'API Mode: Export via database';
}

export function importDB() {
  console.error('Import not allowed in API mode');
}
