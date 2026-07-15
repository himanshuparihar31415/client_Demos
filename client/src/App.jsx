import { useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './Login.jsx';
import Board from './Board.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="center-note">Loading…</div>;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return <Board user={user} onLogout={() => setUser(null)} />;
}
