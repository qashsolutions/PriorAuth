/**
 * Display formatting helpers.
 */

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatNPI(npi) {
  if (!npi) return '—';
  const c = npi.replace(/\D/g, '');
  return c.length === 10 ? c : npi;
}

export function truncate(str, maxLen = 120) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function statusLabel(status) {
  switch (status) {
    case 'pass': return 'Passed';
    case 'fail': return 'Failed';
    case 'warn': return 'Warning';
    case 'info': return 'Info';
    case 'loading': return 'Checking...';
    default: return 'Unknown';
  }
}

export function statusIcon(status) {
  switch (status) {
    case 'pass': return '\u2705';     // green check
    case 'fail': return '\u274C';     // red X
    case 'warn': return '\u26A0\uFE0F'; // warning
    case 'info': return '\u2139\uFE0F'; // info
    case 'loading': return '\u23F3';  // hourglass
    default: return '\u2753';         // question
  }
}
