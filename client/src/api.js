// Thin API client. All requests include the session cookie.
async function req(path, options = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  me: () => req('/me'),
  login: (username, password) =>
    req('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => req('/logout', { method: 'POST' }),
  listEntries: () => req('/entries'),
  createEntry: (entry) =>
    req('/entries', { method: 'POST', body: JSON.stringify(entry) }),
  updateEntry: (id, entry) =>
    req('/entries/' + id, { method: 'PUT', body: JSON.stringify(entry) }),
  deleteEntry: (id) => req('/entries/' + id, { method: 'DELETE' }),
};
