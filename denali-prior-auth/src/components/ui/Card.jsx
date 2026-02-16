export default function Card({ title, status, children, className = '' }) {
  const borderColor = {
    pass: 'border-l-emerald-500',
    fail: 'border-l-red-500',
    warn: 'border-l-amber-500',
    info: 'border-l-blue-500',
    loading: 'border-l-gray-300',
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}
    >
      {status && (
        <div className={`border-l-4 ${borderColor[status] || 'border-l-gray-300'}`}>
          <div className="p-4">
            {title && <h3 className="text-sm font-bold text-gray-900 mb-2">{title}</h3>}
            {children}
          </div>
        </div>
      )}
      {!status && (
        <div className="p-4">
          {title && <h3 className="text-sm font-bold text-gray-900 mb-2">{title}</h3>}
          {children}
        </div>
      )}
    </div>
  );
}
