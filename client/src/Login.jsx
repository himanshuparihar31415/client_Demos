import { useState } from 'react';
import { api } from './api.js';

const logo = (
  <svg viewBox="0 0 24 24" fill="#ffa24d" width="24" height="24">
    <path d="M21 5.5v10.7l-4.4 3.6-6.8-2.5v2.4L6.1 22 3 15.4V8.9l3.7-1.5L12 2l9 3.5zM6.1 8.9v6.2l4.7 1.7V6.5L6.1 8.9zm5.9-2.6l6 2.2v6.9l-6 .6V6.3z" />
  </svg>
);

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
        <div className="login-brand">{logo} Incedo Client Prep</div>
        <h1>Sign in</h1>

        {error && <div className="ado-msgbar error"><span className="bar-icon">⚠</span><div>{error}</div></div>}

        <div className="field">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="someone@example.com"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>
        <div className="login-actions">
          <button className="btn-solid" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <div className="hint">
          Demo credentials:<br />
          <code>admin</code> / <code>demo1234</code>
        </div>
      </form>
    </div>
  );
}
