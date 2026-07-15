import { useMemo, useState } from 'react';
import { statusClass, fmtDate, toKey } from './utils.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarView({ entries, onEdit, onNewOnDate }) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const todayKey = toKey(today);

  const byDate = useMemo(() => {
    const m = {};
    for (const e of entries) {
      if (e.date) (m[e.date] = m[e.date] || []).push(e);
    }
    return m;
  }, [entries]);

  const undated = useMemo(() => entries.filter((e) => !e.date), [entries]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startDay = new Date(year, month, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - startDay + i));

  function move(delta) {
    setCursor(new Date(year, month + delta, 1));
  }
  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <div className="cal">
      <div className="cal-toolbar">
        <div className="cal-title">{MONTHS[month]} {year}</div>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => move(-1)} title="Previous month">‹</button>
          <button className="cal-nav-btn" onClick={goToday}>Today</button>
          <button className="cal-nav-btn" onClick={() => move(1)} title="Next month">›</button>
        </div>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-weekday">{w}</div>
        ))}
        {cells.map((cell, i) => {
          const key = toKey(cell);
          const inMonth = cell.getMonth() === month;
          const items = byDate[key] || [];
          return (
            <div
              key={i}
              className={'cal-cell' + (inMonth ? '' : ' out') + (key === todayKey ? ' today' : '')}
              onClick={() => onNewOnDate(key)}
              title="Add activity on this day"
            >
              <div className="cal-daynum">{cell.getDate()}</div>
              <div className="cal-items">
                {items.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    className={'cal-chip ' + statusClass(e.status)}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEdit(e);
                    }}
                    title={`${e.client} — ${e.type} (${e.status})`}
                  >
                    <span className="state-dot" />
                    <span className="cal-chip-label">{e.client}</span>
                  </button>
                ))}
                {items.length > 3 && <div className="cal-more">+{items.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>

      {undated.length > 0 && (
        <div className="cal-undated">
          <div className="cal-undated-head">No date yet (TBD)</div>
          <div className="cal-undated-list">
            {undated.map((e) => (
              <button
                key={e.id}
                className={'cal-chip ' + statusClass(e.status)}
                onClick={() => onEdit(e)}
                title={`${e.client} — ${e.type} (${e.status})`}
              >
                <span className="state-dot" />
                <span className="cal-chip-label">{e.client} · {e.type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="cal-legend">
        <span><span className="state-dot d-active" /> Scheduled</span>
        <span><span className="state-dot d-closed" /> Completed</span>
        <span><span className="state-dot d-warn" /> Pending</span>
        <span><span className="state-dot d-new" /> Requested</span>
        <span className="cal-legend-hint">Tip: click an empty day to add an activity · {fmtDate(todayKey)} is today</span>
      </div>
    </div>
  );
}
