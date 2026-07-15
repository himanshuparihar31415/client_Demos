import { useMemo, useState } from 'react';
import { statusClass, typeIconClass, fmtDate, daysUntil, initials } from './utils.js';

const TILES = [
  { key: 'all', label: 'Total', tone: 'blue' },
  { key: 'Scheduled', label: 'Scheduled', tone: 'active' },
  { key: 'Completed', label: 'Completed', tone: 'closed' },
  { key: 'upcoming', label: 'Upcoming (5d)', tone: 'warn' },
  { key: 'overdue', label: 'Overdue', tone: 'danger' },
];

export default function Overview({ entries, onEdit, onRemove }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const counts = useMemo(() => {
    const c = { all: entries.length, Scheduled: 0, Completed: 0, Pending: 0, Requested: 0, upcoming: 0, overdue: 0 };
    for (const e of entries) {
      if (c[e.status] !== undefined) c[e.status] += 1;
      const du = daysUntil(e.date);
      if (du !== null && e.status.toLowerCase() !== 'completed') {
        if (du >= 0 && du <= 5) c.upcoming += 1;
        else if (du < 0) c.overdue += 1;
      }
    }
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (q && !e.client.toLowerCase().includes(q.toLowerCase())) return false;
      const du = daysUntil(e.date);
      const notDone = e.status.toLowerCase() !== 'completed';
      if (filter === 'all') return true;
      if (filter === 'upcoming') return du !== null && du >= 0 && du <= 5 && notDone;
      if (filter === 'overdue') return du !== null && du < 0 && notDone;
      return e.status === filter;
    });
  }, [entries, filter, q]);

  return (
    <div className="ov">
      <div className="stat-row">
        {TILES.map((t) => (
          <button
            key={t.key}
            className={'stat-tile tone-' + t.tone + (filter === t.key ? ' active' : '')}
            onClick={() => setFilter(t.key)}
          >
            <span className="stat-num">{counts[t.key]}</span>
            <span className="stat-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="ov-toolbar">
        <div className="chip-filters">
          {['all', 'Scheduled', 'Completed', 'Pending', 'Requested'].map((s) => (
            <button
              key={s}
              className={'chip-filter' + (filter === s ? ' active' : '')}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <input
          className="ov-search"
          placeholder="Search client…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty">No activities match this filter.</div>
      ) : (
        <div className="card-grid">
          {filtered.map((e) => {
            const du = daysUntil(e.date);
            const overdue = du !== null && du < 0 && e.status.toLowerCase() !== 'completed';
            let dateLabel = fmtDate(e.date);
            if (du === 0) dateLabel += ' · today';
            else if (du > 0 && du <= 5) dateLabel += ` · in ${du}d`;
            else if (overdue) dateLabel += ' · overdue';
            return (
              <div className="card" key={e.id} onClick={() => onEdit(e)}>
                <div className="card-head">
                  <span className={'wi-type-icon ' + typeIconClass(e.type)} />
                  <span className="card-client">{e.client}</span>
                  <button
                    className="icon-btn card-del"
                    title="Delete"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onRemove(e.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="card-row">
                  <span className={'state ' + statusClass(e.status)}>
                    <span className="state-dot" />
                    {e.status}
                  </span>
                  <span className="card-type">{e.type}</span>
                </div>
                <div className={'card-date' + (overdue ? ' date-overdue' : '')}>{dateLabel}</div>
                <div className="card-owner">
                  {e.owner ? (
                    <>
                      <span className="oa">{initials(e.owner)}</span>
                      {e.owner}
                    </>
                  ) : (
                    <span className="muted">Unassigned</span>
                  )}
                </div>
                {e.notes && <div className="card-notes">{e.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
