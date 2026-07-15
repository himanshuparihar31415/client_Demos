import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { daysUntil, initials, TYPES, STATUSES } from './utils.js';
import Overview from './Overview.jsx';
import BoardGrid from './BoardGrid.jsx';
import CalendarView from './CalendarView.jsx';

const EMPTY = { client: '', type: 'Demo', date: '', status: 'Scheduled', owner: '', notes: '' };

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
  calendar: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="3" width="12" height="11" rx="1"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="5" y1="1.5" x2="5" y2="4"/><line x1="11" y1="1.5" x2="11" y2="4"/></svg>
  ),
};

const VIEWS = {
  overview: { title: 'Overview', crumb: 'Overview' },
  board: { title: 'Demos & Pilots', crumb: 'Demos & Pilots' },
  calendar: { title: 'Calendar', crumb: 'Calendar' },
};

export default function Board({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [now, setNow] = useState(new Date());
  const [view, setView] = useState('overview');

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

  function openNew(prefillDate) {
    setEditId(null);
    setForm({ ...EMPTY, date: typeof prefillDate === 'string' ? prefillDate : '' });
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
    if (!confirm('Remove this activity from the tracker?')) return;
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

  const navItem = (key, icon, label) => (
    <li className={view === key ? 'active' : ''} onClick={() => setView(key)}>
      {icon} {label}
    </li>
  );

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
            <div className="ado-project-icon">C</div>
            <div className="ado-project-name">Client Demos &amp; Prep</div>
          </div>
          <ul className="ado-nav">
            {navItem('overview', Icon.overview, 'Overview')}
            {navItem('board', Icon.boards, 'Demos & Pilots')}
            {navItem('calendar', Icon.calendar, 'Calendar')}
          </ul>
          <button className="ado-signout" onClick={signOut}>Sign out — {user}</button>
        </nav>

        <main className="ado-content">
          <div className="ado-breadcrumb">Client Prep <span>/</span> <b>{VIEWS[view].crumb}</b></div>
          <h1 className="ado-title">{VIEWS[view].title}</h1>

          <div className="ado-commandbar">
            <button className="ado-btn-primary" onClick={() => openNew()}>+ New Activity</button>
            <span className="ado-count">
              {entries.length} {entries.length === 1 ? 'activity' : 'activities'}
            </span>
          </div>

          {err && (
            <div className="ado-msgbar error"><span className="bar-icon">⚠</span><div>{err}</div></div>
          )}

          {view === 'board' && (upcoming.length > 0 || overdue.length > 0) && (
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

          {view === 'overview' && <Overview entries={sorted} onEdit={openEdit} onRemove={remove} />}
          {view === 'board' && <BoardGrid entries={sorted} loading={loading} onEdit={openEdit} onRemove={remove} />}
          {view === 'calendar' && <CalendarView entries={sorted} onEdit={openEdit} onNewOnDate={(d) => openNew(d)} />}

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
              <h2>{editId ? 'Edit Activity' : 'New Activity'}</h2>
              <button type="button" className="panel-close" onClick={() => setPanelOpen(false)}>✕</button>
            </div>
            <div className="panel-body">
              <div className="field">
                <label>Client</label>
                <input
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  placeholder="e.g. Syneos"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Date (blank if TBD)</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Owner / Presenter</label>
                <input
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  placeholder="e.g. Ujjwal"
                />
              </div>
              <div className="field">
                <label>Prep Notes</label>
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
