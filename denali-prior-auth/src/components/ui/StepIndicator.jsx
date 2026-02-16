export default function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              i < current
                ? 'bg-denali-600 text-white'
                : i === current
                ? 'bg-denali-100 text-denali-800 ring-2 ring-denali-500'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {i < current ? '\u2713' : i + 1}
          </div>
          <span
            className={`text-xs font-medium ${
              i <= current ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 ${
                i < current ? 'bg-denali-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
