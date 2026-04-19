import { dataClient } from './dataClient';

const SESSION_KEY = 'tpm-audit:session:v1';

export const authService = {
  async login(username, password) {
    const users = await dataClient.get('users');
    const u = users.find(
      (x) => x.username.toLowerCase() === String(username).toLowerCase() && x.password === password && x.active !== false
    );
    if (!u) throw new Error('Identifiants invalides');
    const session = { userId: u.id, at: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return u;
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
  async currentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const { userId } = JSON.parse(raw);
      const users = await dataClient.get('users');
      return users.find((u) => u.id === userId) || null;
    } catch {
      return null;
    }
  },
};
