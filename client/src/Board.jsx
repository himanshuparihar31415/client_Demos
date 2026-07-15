import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const EMPTY = { client: '', type: 'Demo', date: '', status: 'Scheduled', owner: '', notes: '' };

function statusClass(s) {
  return 'status-' + ((s || '').toLowerCase().split(' ')[0].split('/')[0].trim() || 'pending');
}

function typeIconClass(t) {
  const k = (t || '').toLowerCase();
  if (k.startsWith('pilot')) return 'wi-type-pilot';
  if (k.startsWith('internal')) return 'wi-type-internal';
  return 'wi-type-demo';
}

function fmtDate(d) {
  if (!d) return 'TBD';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d) {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return null;
  return Math.round((dt - today) / 86400000);
}

function initials(name) {
  return (name || '?').trim().slice(0, 2);
}

// --- tiny inline icons (Azure DevOps-ish) ---
const Icon = {
  logo: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 5.5v10.7l-4.4 3.6-6.8-2.5v2.4L6.1 22 3 15.4V8.9l3.7-1.5L12 2l9 3.5zM6.1 8.9v6.2l4.7 1.7V6.5L6.1 8.9zm5.9-2.6l6 2.2v6.9l-6 .6V6.3z"/></svg>
  ),
  overview: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg>
  ),
  boards: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="2" width="12" height="12"/><line x1="6" y1="2" x2="6" y2="14"/><line x1="10" y1="2" x2="10" y2="14"/></svg>
  ),
  repos: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M4 2h8v12H4z"/><path d="M4 11h8"/></svg>
  ),
  pipelines: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="4" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><path d="M6 4h4a2 2 0 0 1 2 2v4"/></svg>
  ),
  test: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M6 2v4L3 13a1 1 0 0 0 1 1.5h8A1 1 0 0 0 13 13l-3-7V2"/><line x1="5" y1="2" x2="11" y2="2"/></svg>
  ),
};

export default function Board({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    setLoading(true);
    try {
      setEntries(await api.listEntries());
      setErr('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }, [entries]);

  const { upcoming, overdue } = useMemo(() => {
    const up = [];
    const od = [];
    for (const e of sorted) {
      const du = daysUntil(e.date);
      if (du === null || e.status.toLowerCase() === 'completed') continue;
      if (du >= 0 && du <= 5) up.push(e);
      else if (du < 0) od.push(e);
    }
    return { upcoming: up, overdue: od };
  }, [sorted]);

  function openNew() {
    setEditId(null);
    setForm(EMPTY);
    setPanelOpen(true);
  }

  function openEdit(e) {
    setEditId(e.id);
    setForm({
      client: e.client,
      type: e.type,
      date: e.date || '',
      status: e.status,
      owner: e.owner || '',
      notes: e.notes || '',
    });
    setPanelOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.client.trim()) {
      alert('Client name is required.');
      return;
    }
    try {
      if (editId) await api.updateEntry(editId, form);
      else await api.createEntry(form);
      setPanelOpen(false);
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function remove(id) {
    if (!confirm('Remove this work item from the board?')) return;
    try {
      await api.deleteEntry(id);
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function signOut() {
    try {
      await api.logout();
    } finally {
      onLogout();
    }
  }

  const clock = now.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="ado">
      <header className="ado-topbar">
        <div className="ado-topbar-left">
          <span className="ado-logo">{Icon.logo} Incedo Client Prep</span>
          <span className="ado-org">himanshuparihar</span>
        </div>
        <div className="ado-topbar-right">
          <span className="ado-clock">{clock}</span>
          <div className="ado-avatar" title={user}>{initials(user)}</div>
        </div>
      </header>

      <div className="ado-body">
        <nav className="ado-sidebar">
          <div className="ado-project">
            <div className="ado-project-icon">D</div>
            <div className="ado-project-name">Demos &amp; Pilots</div>
          </div>
          <ul className="ado-nav">
            <li>{Icon.overview} Overview</li>
            <li className="active">{Icon.boards} Boards</li>
            <li>{Icon.repos} Repos</li>
            <li>{Icon.pipelines} Pipelines</li>
            <li>{Icon.test} Test Plans</li>
          </ul>
          <button className="ado-signout" onClick={signOut}>Sign out — {user}</button>
        </nav>

        <main className="ado-content">
          <div className="ado-breadcrumb">Boards <span>/</span> <b>Work Items</b></div>
          <h1 className="ado-title">Work Items</h1>

          <div className="ado-commandbar">
            <button className="ado-btn-primary" onClick={openNew}>+ New Work Item</button>
            <span className="ado-count">
              {entries.length} {entries.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {(upcoming.length > 0 || overdue.length > 0) && (
            <div className="ado-msgbar info">
              <span className="bar-icon">ⓘ</span>
              <div>
                <div>Due in the next 5 days</div>
                <div className="ado-chips">
                  {overdue.map((e) => (
                    <span key={'o' + e.id} className="ado-chip overdue">{e.client} — overdue</span>
                  ))}
                  {upcoming.map((e) => {
                    const du = daysUntil(e.date);
                    return (
                      <span key={'u' + e.id} className="ado-chip">
                        {e.client} — {du === 0 ? 'today' : `in ${du}d`}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {err && (
            <div className="ado-msgbar error"><span className="bar-icon">⚠</span><div>{err}</div></div>
          )}

          <div className="ado-grid">
            <div className="ado-grid-head">
              <div>ID</div>
              <div>Title</div>
              <div>State</div>
              <div>Work Item Type</div>
              <div>Target Date</div>
              <div>Assigned To</div>
              <div></div>
            </div>

            {loading ? (
              <div className="empty">Loading work items…</div>
            ) : sorted.length === 0 ? (
              <div className="empty">No work items yet. Create your first one.</div>
            ) : (
              sorted.map((e, i) => {
                const du = daysUntil(e.date);
                const overdueDate = du !== null && du < 0 && e.status.toLowerCase() !== 'completed';
                let dateLabel = fmtDate(e.date);
                if (du === 0) dateLabel += ' · today';
                else if (du > 0 && du <= 5) dateLabel += ` · in ${du}d`;
                else if (overdueDate) dateLabel += ' · overdue';
                return (
                  <div className="ado-row" key={e.id}>
                    <div className="ado-id">#{i + 1}</div>
                    <div className="wi-title">
                      <span className={'wi-type-icon ' + typeIconClass(e.type)} />
                      <span className="name" onClick={() => openEdit(e)}>{e.client}</span>
                    </div>
                    <div>
                      <span className={'state ' + statusClass(e.status)}>
                        <span className="state-dot" />
                        {e.status}
                      </span>
                    </div>
                    <div>{e.type}</div>
                    <div className={overdueDate ? 'date-overdue' : ''}>{dateLabel}</div>
                    <div>
                      {e.owner ? (
                        <span className="owner-avatar">
                          <span className="oa">{initials(e.owner)}</span>
                          {e.owner}
                        </span>
                      ) : (
                        <span className="muted">Unassigned</span>
                      )}
                    </div>
                    <div className="row-actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(e)}>✎</button>
                      <button className="icon-btn" title="Delete" onClick={() => remove(e.id)}>✕</button>
                    </div>
                    {e.notes && <div className="notes-row">{e.notes}</div>}
                  </div>
                );
              })
            )}
          </div>

          <div className="ado-foot">Data saved on the server · shared across browsers</div>
        </main>
      </div>

      {panelOpen && (
        <div
          className="overlay"
          onClick={(e) => e.target.classList.contains('overlay') && setPanelOpen(false)}
        >
          <form className="panel" onSubmit={save}>
            <div className="panel-head">
              <h2>{editId ? 'Edit Work Item' : 'New Work Item'}</h2>
              <button type="button" className="panel-close" onClick={() => setPanelOpen(false)}>✕</button>
            </div>
            <div className="panel-body">
              <div className="field">
                <label>Client / Title</label>
                <input
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  placeholder="e.g. Syneos"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Work Item Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>Demo</option>
                  <option>Pilot</option>
                  <option>Internal / Automation</option>
                </select>
              </div>
              <div className="field">
                <label>Target Date (blank if TBD)</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="field">
                <label>State</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Scheduled</option>
                  <option>Completed</option>
                  <option>Pending</option>
                  <option>Requested</option>
                </select>
              </div>
              <div className="field">
                <label>Assigned To</label>
                <input
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  placeholder="e.g. Ujjwal"
                />
              </div>
              <div className="field">
                <label>Discussion / Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any context worth remembering"
                />
              </div>
            </div>
            <div className="panel-foot">
              <button type="submit" className="btn-solid">Save</button>
              <button type="button" className="btn-ghost" onClick={() => setPanelOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
