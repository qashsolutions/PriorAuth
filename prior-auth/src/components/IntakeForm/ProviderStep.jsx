import { useState, useCallback } from 'react';
import { validateNPI } from '../../utils/npiValidator';
import { lookupNPI } from '../../services/nppes';

export default function ProviderStep({ data, onChange, onNext, onBack }) {
  const [errors, setErrors] = useState({});
  // If provider info is already pre-filled (demo mode), show it immediately
  const [npiLookup, setNpiLookup] = useState(
    data.providerName
      ? { found: true, active: true, name: data.providerName, specialty: data.providerSpecialty, address: data.providerAddress }
      : null
  );
  const [lookingUp, setLookingUp] = useState(false);

  function handleChange(field, value) {
    onChange({ ...data, [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  }

  const handleNPIBlur = useCallback(async () => {
    if (!data.npi || data.npi.length < 10) return;

    const result = validateNPI(data.npi);
    if (!result.valid) {
      setErrors((prev) => ({ ...prev, npi: result.error }));
      setNpiLookup(null);
      return;
    }

    setLookingUp(true);
    try {
      const info = await lookupNPI(data.npi);
      setNpiLookup(info);
      if (info.found && info.active) {
        onChange({
          ...data,
          providerName: info.name,
          providerSpecialty: info.specialty,
          providerAddress: info.address,
        });
      } else if (info.found && !info.active) {
        setErrors((prev) => ({ ...prev, npi: 'This NPI is registered but not active' }));
      } else {
        setErrors((prev) => ({ ...prev, npi: 'NPI not found in NPPES registry' }));
      }
    } catch {
      // Non-blocking — NPI validation still passed Luhn
      setNpiLookup(null);
    } finally {
      setLookingUp(false);
    }
  }, [data, onChange]);

  function validate() {
    const errs = {};

    const npiResult = validateNPI(data.npi);
    if (!npiResult.valid) errs.npi = npiResult.error;

    if (!data.practiceZip?.trim()) {
      errs.practiceZip = 'Practice ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(data.practiceZip.trim())) {
      errs.practiceZip = 'Enter a valid 5-digit ZIP code';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Step 2 — Provider Information</h2>
      <p className="text-sm text-gray-500">Enter the ordering provider NPI and practice location.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ordering Provider NPI
        </label>
        <input
          type="text"
          value={data.npi || ''}
          onChange={(e) => handleChange('npi', e.target.value.replace(/\D/g, ''))}
          onBlur={handleNPIBlur}
          placeholder="1234567890"
          maxLength={10}
          className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
            errors.npi ? 'border-red-400 bg-red-50' : 'border-gray-300'
          } focus:ring-2 focus:ring-denali-500 focus:border-denali-500`}
        />
        {errors.npi && <p className="mt-1 text-xs text-red-600">{errors.npi}</p>}
        {lookingUp && <p className="mt-1 text-xs text-gray-400">Looking up NPI...</p>}
      </div>

      {npiLookup?.found && npiLookup.active && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
          <p className="font-medium text-emerald-800">{npiLookup.name}</p>
          <p className="text-emerald-600 text-xs">{npiLookup.specialty}</p>
          {npiLookup.address && (
            <p className="text-emerald-600 text-xs mt-1">{npiLookup.address}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Practice ZIP Code</label>
        <input
          type="text"
          value={data.practiceZip || ''}
          onChange={(e) => handleChange('practiceZip', e.target.value.replace(/[^\d-]/g, ''))}
          placeholder="75001"
          maxLength={10}
          className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
            errors.practiceZip ? 'border-red-400 bg-red-50' : 'border-gray-300'
          } focus:ring-2 focus:ring-denali-500 focus:border-denali-500`}
        />
        {errors.practiceZip && <p className="mt-1 text-xs text-red-600">{errors.practiceZip}</p>}
        <p className="mt-1 text-xs text-gray-400">Used for MAC routing (regional LCD lookup)</p>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-denali-600 text-white rounded-lg font-medium text-sm hover:bg-denali-700 transition-colors"
        >
          Next: Clinical Details
        </button>
      </div>
    </div>
  );
}
