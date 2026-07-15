// Shared helpers used across the board, overview and calendar views.

export function statusClass(s) {
  return 'status-' + ((s || '').toLowerCase().split(' ')[0].split('/')[0].trim() || 'pending');
}

export function typeIconClass(t) {
  const k = (t || '').toLowerCase();
  if (k.startsWith('pilot')) return 'wi-type-pilot';
  if (k.startsWith('meeting')) return 'wi-type-meeting';
  if (k.startsWith('internal')) return 'wi-type-internal';
  return 'wi-type-demo';
}

export function fmtDate(d) {
  if (!d) return 'TBD';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(d) {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return null;
  return Math.round((dt - today) / 86400000);
}

export function initials(name) {
  return (name || '?').trim().slice(0, 2);
}

// yyyy-mm-dd key for a Date (local time), matching entry.date format.
export function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const TYPES = ['Demo', 'Pilot', 'Meeting', 'Internal / Automation'];
export const STATUSES = ['Scheduled', 'Completed', 'Pending', 'Requested'];
