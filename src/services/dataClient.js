// ----------------------------------------------------------------------------
// dataClient — single abstraction boundary between UI and data source.
// Today it reads/writes JSON via localStorage-backed in-memory cache.
// Tomorrow, swap the body of each method to call a REST/GraphQL backend
// without touching any component or service consumer.
// ----------------------------------------------------------------------------

import projectsSeed from '../data/projects.json';
import checklistSeed from '../data/checklist.json';
import usersSeed from '../data/users.json';
import planningSeed from '../data/planning.json';

const API_URL = '/.netlify/functions/api';

async function fetchApi(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Une erreur est survenue');
  }
  return response.json();
}

export const dataClient = {
  async get(collection) {
    return fetchApi(`/${collection}`);
  },
  async set(collection, value) {
    return fetchApi(`/${collection}`, {
      method: 'POST',
      body: JSON.stringify(value),
    });
  },
  async patch(collection, updater) {
    // In a real API, patching usually targets an ID. 
    // Here we'll need specific endpoints for performance.
    // For now, we simulate the 'get-then-set' pattern if needed, 
    // but the services should ideally call specific API endpoints.
    const current = await this.get(collection);
    const updated = updater(current);
    return this.set(collection, updated);
  },
  async reset() {
    return fetchApi('/reset', { method: 'POST' });
  },
};



export function exportDB() {
  console.warn('exportDB is not implemented for API mode');
  return "{}";
}

export function importDB(json) {
  console.warn('importDB is not implemented for API mode');
}

