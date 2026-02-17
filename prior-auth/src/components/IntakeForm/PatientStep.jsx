import { useState } from 'react';
import { validateMBI, formatMBI } from '../../utils/mbiValidator';

export default function PatientStep({ data, onChange, onNext }) {
  const [errors, setErrors] = useState({});

  function handleChange(field, value) {
    onChange({ ...data, [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  }

  function validate() {
    const errs = {};

    const mbiResult = validateMBI(data.mbi);
    if (!mbiResult.valid) errs.mbi = mbiResult.error;

    if (!data.firstName?.trim()) errs.firstName = 'First name is required';
    if (!data.lastName?.trim()) errs.lastName = 'Last name is required';
    if (!data.dob) errs.dob = 'Date of birth is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (validate()) {
      // Store MBI in formatted form (with hyphens) — e.g. 1EG4-TE5-MK73
      const cleaned = data.mbi?.replace(/[-\s]/g, '').toUpperCase();
      onChange({ ...data, mbi: formatMBI(cleaned) });
      onNext();
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Step 1 — Patient Information</h2>
      <p className="text-sm text-gray-500">Enter the Medicare beneficiary details.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Medicare Beneficiary Identifier (MBI)
        </label>
        <input
          type="text"
          value={data.mbi || ''}
          onChange={(e) => handleChange('mbi', e.target.value)}
          onBlur={() => {
            if (data.mbi) {
              const result = validateMBI(data.mbi);
              if (result.valid) {
                onChange({ ...data, mbi: formatMBI(data.mbi) });
              }
            }
          }}
          placeholder="1EG4-TE5-MK73"
          maxLength={14}
          className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
            errors.mbi ? 'border-red-400 bg-red-50' : 'border-gray-300'
          } focus:ring-2 focus:ring-denali-500 focus:border-denali-500`}
        />
        {errors.mbi && <p className="mt-1 text-xs text-red-600">{errors.mbi}</p>}
        <p className="mt-1 text-xs text-gray-400">Format: 1AN-A9AN-AA99 (11 characters)</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input
            type="text"
            value={data.firstName || ''}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm ${
              errors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-300'
            } focus:ring-2 focus:ring-denali-500 focus:border-denali-500`}
          />
          {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input
            type="text"
            value={data.lastName || ''}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm ${
              errors.lastName ? 'border-red-400 bg-red-50' : 'border-gray-300'
            } focus:ring-2 focus:ring-denali-500 focus:border-denali-500`}
          />
          {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
        <input
          type="date"
          value={data.dob || ''}
          onChange={(e) => handleChange('dob', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg text-sm ${
            errors.dob ? 'border-red-400 bg-red-50' : 'border-gray-300'
          } focus:ring-2 focus:ring-denali-500 focus:border-denali-500`}
        />
        {errors.dob && <p className="mt-1 text-xs text-red-600">{errors.dob}</p>}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-denali-600 text-white rounded-lg font-medium text-sm hover:bg-denali-700 transition-colors"
        >
          Next: Provider Info
        </button>
      </div>
    </div>
  );
}
