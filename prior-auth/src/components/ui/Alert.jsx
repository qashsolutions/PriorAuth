const STYLES = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warn: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
};

export default function Alert({ type = 'info', title, children }) {
  return (
    <div className={`p-4 border rounded-lg ${STYLES[type] || STYLES.info}`}>
      {title && <p className="font-semibold text-sm mb-1">{title}</p>}
      <div className="text-sm">{children}</div>
    </div>
  );
}
