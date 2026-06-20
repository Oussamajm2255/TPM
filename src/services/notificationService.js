import { dataClient } from './dataClient';

export const notificationService = {
  async list(userId) {
    const notifs = await dataClient.get('notifications');
    return notifs
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
      .slice(0, 20);
  },

  async markAsRead(id) {
    return dataClient.patch('notifications', (prev) =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
  },

  async markAllAsRead(userId) {
    return dataClient.patch('notifications', (prev) =>
      prev.map(n =>
        n.user_id === userId ? { ...n, is_read: true } : n
      )
    );
  },

  async create(notif) {
    return dataClient.patch('notifications', (prev) => {
      const item = {
        id: `N${Date.now().toString(36)}`,
        ...notif,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      return [...prev, item];
    });
  },

  subscribe(_userId, _onUpdate) {
    // Realtime not available in local mode
  },

  unsubscribe() {
    // No-op in local mode
  },
};
