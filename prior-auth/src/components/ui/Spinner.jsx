export default function Spinner({ size = 'md', label = 'Loading...' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizes[size]} border-gray-200 border-t-denali-600 rounded-full animate-spin`}
      />
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  );
}
