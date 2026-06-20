// notificationService — calls Railway Express API

const API = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

export const notificationService = {
  async list(userId) {
    return request(`/notifications?userId=${userId}`);
  },

  async markAsRead(id) {
    return request(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllAsRead(userId) {
    return request(`/notifications/read-all?userId=${userId}`, { method: 'PATCH' });
  },

  async create(notif) {
    return request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notif),
    });
  },

  subscribe(_userId, _onUpdate) {
    // Realtime not available in API mode
  },

  unsubscribe() {
    // No-op
  },
};
