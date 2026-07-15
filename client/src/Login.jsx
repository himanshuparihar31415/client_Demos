import { useState } from 'react';
import { api } from './api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.login(username, password);
      onLogin(res.user);
    } catch (err) {
      setError(err.message || 'Sign in failed');
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit} autoComplete="off">
        <div className="brand">
          <h1>Departures</h1>
          <div className="sub">Sign In</div>
        </div>

        {error && <div className="error show">{error}</div>}

        <div className="field">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
        </div>
        <button className="btn-solid full" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="hint">
          Demo credentials:<br />
          <code>admin</code> / <code>demo1234</code>
        </div>
      </form>
    </div>
  );
}
