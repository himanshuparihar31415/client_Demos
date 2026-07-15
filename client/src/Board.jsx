import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const EMPTY = { client: '', type: 'Demo', date: '', status: 'Scheduled', owner: '', notes: '' };

function statusClass(s) {
  return 'status-' + ((s || '').toLowerCase().split(' ')[0].split('/')[0].trim() || 'pending');
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

export default function Board({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
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
    setModalOpen(true);
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
    setModalOpen(true);
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
      setModalOpen(false);
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function remove(id) {
    if (!confirm('Remove this entry from the board?')) return;
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
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="wrap">
      <div className="masthead">
        <div>
          <h1>Departures</h1>
          <div className="sub">Client Demos &amp; Pilots Board</div>
        </div>
        <div>
          <div className="clock">{clock}</div>
          <div className="session">
            <span className="who">Signed in as {user}</span>
            <button className="signout" onClick={signOut}>Sign Out</button>
          </div>
        </div>
      </div>

      {(upcoming.length > 0 || overdue.length > 0) && (
        <div className="board-alert show">
          <div><b>▲ Upcoming</b> — next 5 days</div>
          <div className="row">
            {overdue.map((e) => (
              <span key={'o' + e.id} className="chip overdue">{e.client} — overdue</span>
            ))}
            {upcoming.map((e) => {
              const du = daysUntil(e.date);
              return (
                <span key={'u' + e.id} className="chip">
                  {e.client} — {du === 0 ? 'today' : `in ${du}d`}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="count">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} on the board
        </div>
        <button className="add-btn" onClick={openNew}>+ New Entry</button>
      </div>

      {err && <div className="error show">{err}</div>}

      <div className="board">
        <div className="board-head">
          <div>#</div>
          <div>Client</div>
          <div>Type</div>
          <div>Date</div>
          <div>Status</div>
          <div>Owner</div>
          <div></div>
        </div>

        {loading ? (
          <div className="empty">Loading board…</div>
        ) : sorted.length === 0 ? (
          <div className="empty">Nothing on the board yet. Add your first entry.</div>
        ) : (
          sorted.map((e, i) => {
            const du = daysUntil(e.date);
            let dateLabel = fmtDate(e.date);
            if (du !== null) {
              if (du === 0) dateLabel += '  · today';
              else if (du > 0 && du <= 5) dateLabel += '  · in ' + du + 'd';
              else if (du < 0 && e.status.toLowerCase() !== 'completed') dateLabel += '  · overdue';
            }
            return (
              <div className="flap-row" key={e.id}>
                <div className="idx">{String(i + 1).padStart(2, '0')}</div>
                <div className="client">{e.client}</div>
                <div>{e.type}</div>
                <div>{dateLabel}</div>
                <div>
                  <span className={'status-pill ' + statusClass(e.status)}>{e.status}</span>
                </div>
                <div>{e.owner || '—'}</div>
                <div className="row-actions">
                  <button className="icon-btn" title="Edit" onClick={() => openEdit(e)}>✎</button>
                  <button className="icon-btn" title="Delete" onClick={() => remove(e.id)}>✕</button>
                </div>
                {e.notes && <div className="notes show">{e.notes}</div>}
              </div>
            );
          })
        )}
      </div>

      <div className="foot-note">Data saved on the server · shared across browsers</div>

      {modalOpen && (
        <div className="overlay show" onClick={(e) => e.target.classList.contains('overlay') && setModalOpen(false)}>
          <form className="modal" onSubmit={save}>
            <h2>{editId ? 'Edit Entry' : 'New Entry'}</h2>
            <div className="field">
              <label>Client Name</label>
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
                <option>Demo</option>
                <option>Pilot</option>
                <option>Internal / Automation</option>
              </select>
            </div>
            <div className="field">
              <label>Date (or leave blank if TBD)</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Scheduled</option>
                <option>Completed</option>
                <option>Pending</option>
                <option>Requested</option>
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
              <label>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any context worth remembering"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-solid">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
