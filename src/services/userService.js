import { dataClient } from './dataClient';

export const userService = {
  list: () => dataClient.get('users'),

  async technicians() {
    const users = await dataClient.get('users');
    return users.filter((u) => u.role === 'technician' && u.active !== false);
  },

  async upsert(user) {
    return dataClient.patch('users', (prev) => {
      const idx = prev.findIndex((u) => u.id === user.id);
      if (idx === -1) return [...prev, user];
      const next = prev.slice();
      next[idx] = { ...next[idx], ...user };
      return next;
    });
  },

  async remove(id) {
    return dataClient.patch('users', (prev) => prev.filter((u) => u.id !== id));
  },
};
