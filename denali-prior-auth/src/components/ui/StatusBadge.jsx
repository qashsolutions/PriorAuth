const STYLES = {
  pass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  fail: 'bg-red-50 text-red-800 border-red-200',
  warn: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  loading: 'bg-gray-50 text-gray-500 border-gray-200',
};

const ICONS = {
  pass: '\u2705',
  fail: '\u274C',
  warn: '\u26A0\uFE0F',
  info: '\u2139\uFE0F',
  loading: '\u23F3',
};

export default function StatusBadge({ status, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-full ${
        STYLES[status] || STYLES.info
      }`}
    >
      <span>{ICONS[status] || ''}</span>
      {label}
    </span>
  );
}
