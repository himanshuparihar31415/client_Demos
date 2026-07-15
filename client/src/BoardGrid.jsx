import { statusClass, typeIconClass, fmtDate, daysUntil, initials } from './utils.js';

export default function BoardGrid({ entries, loading, onEdit, onRemove }) {
  return (
    <div className="ado-grid">
      <div className="ado-grid-head">
        <div>ID</div>
        <div>Client</div>
        <div>Status</div>
        <div>Type</div>
        <div>Demo Date</div>
        <div>Owner</div>
        <div></div>
      </div>

      {loading ? (
        <div className="empty">Loading demos…</div>
      ) : entries.length === 0 ? (
        <div className="empty">No demos tracked yet. Add your first one.</div>
      ) : (
        entries.map((e, i) => {
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
                <span className="name" onClick={() => onEdit(e)}>{e.client}</span>
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
                <button className="icon-btn" title="Edit" onClick={() => onEdit(e)}>✎</button>
                <button className="icon-btn" title="Delete" onClick={() => onRemove(e.id)}>✕</button>
              </div>
              {e.notes && <div className="notes-row">{e.notes}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
