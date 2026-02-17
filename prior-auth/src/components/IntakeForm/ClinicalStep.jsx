import { useState, useCallback } from 'react';
import { validateICD10 } from '../../services/icd10';

const PLACE_OF_SERVICE = [
  { code: '11', label: 'Office' },
  { code: '19', label: 'Off-campus outpatient hospital' },
  { code: '22', label: 'On-campus outpatient hospital' },
  { code: '21', label: 'Inpatient hospital' },
  { code: '24', label: 'Ambulatory surgical center' },
];

export default function ClinicalStep({ data, onChange, onSubmit, onBack }) {
  const [errors, setErrors] = useState({});
  // If ICD-10 description is already pre-filled (demo mode), show it immediately
  const [icd10Info, setIcd10Info] = useState(
    data.icd10Description
      ? { valid: true, billable: true, code: data.icd10, description: data.icd10Description }
      : null
  );
  const [lookingUp, setLookingUp] = useState(false);

  function handleChange(field, value) {
    onChange({ ...data, [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  }

  const handleICD10Blur = useCallback(async () => {
    if (!data.icd10 || data.icd10.length < 3) return;

    setLookingUp(true);
    try {
      const result = await validateICD10(data.icd10);
      setIcd10Info(result);

      if (result.valid && result.description) {
        onChange({ ...data, icd10Description: result.description });
      }

      if (!result.valid) {
        setErrors((prev) => ({ ...prev, icd10: result.error }));
      } else if (!result.billable) {
        setErrors((prev) => ({ ...prev, icd10: result.error }));
      }
    } catch {
      setIcd10Info(null);
    } finally {
      setLookingUp(false);
    }
  }, [data, onChange]);

  function validate() {
    const errs = {};

    if (!data.icd10?.trim()) errs.icd10 = 'ICD-10 diagnosis code is required';
    if (!data.cpt?.trim()) errs.cpt = 'CPT/HCPCS procedure code is required';
    if (!data.placeOfService) errs.placeOfService = 'Place of service is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (validate()) onSubmit();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Step 3 — Clinical Details</h2>
      <p className="text-sm text-gray-500">Enter diagnosis, procedure, and clinical summary.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ICD-10 Diagnosis Code
        </label>
        <input
          type="text"
          value={data.icd10 || ''}
          onChange={(e) => handleChange('icd10', e.target.value.toUpperCase())}
          onBlur={handleICD10Blur}
          placeholder="C34.90"
          maxLength={8}
          className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
            errors.icd10 ? 'border-red-400 bg-red-50' : 'border-gray-300'
          } focus:ring-2 focus:ring-denali-500 focus:border-denali-500`}
        />
        {errors.icd10 && <p className="mt-1 text-xs text-red-600">{errors.icd10}</p>}
        {lookingUp && <p className="mt-1 text-xs text-gray-400">Validating ICD-10 code...</p>}
      </div>

      {icd10Info?.valid && icd10Info.description && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
          <p className="text-emerald-800">
            <span className="font-mono font-medium">{icd10Info.code}</span> — {icd10Info.description}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CPT/HCPCS Procedure Code
        </label>
        <input
          type="text"
          value={data.cpt || ''}
          onChange={(e) => handleChange('cpt', e.target.value.toUpperCase())}
          placeholder="77385"
          maxLength={5}
          className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
            errors.cpt ? 'border-red-400 bg-red-50' : 'border-gray-300'
          } focus:ring-2 focus:ring-denali-500 focus:border-denali-500`}
        />
        {errors.cpt && <p className="mt-1 text-xs text-red-600">{errors.cpt}</p>}
        <p className="mt-1 text-xs text-amber-600">
          Note: CPT descriptions are not displayed (AMA license pending). Code accepted as-is.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Place of Service</label>
        <select
          value={data.placeOfService || ''}
          onChange={(e) => handleChange('placeOfService', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg text-sm ${
            errors.placeOfService ? 'border-red-400 bg-red-50' : 'border-gray-300'
          } focus:ring-2 focus:ring-denali-500 focus:border-denali-500`}
        >
          <option value="">Select...</option>
          {PLACE_OF_SERVICE.map((pos) => (
            <option key={pos.code} value={pos.code}>
              {pos.code} — {pos.label}
            </option>
          ))}
        </select>
        {errors.placeOfService && (
          <p className="mt-1 text-xs text-red-600">{errors.placeOfService}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Clinical Summary <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={data.clinicalSummary || ''}
          onChange={(e) => handleChange('clinicalSummary', e.target.value)}
          placeholder="Staging, pathology, prior treatments, clinical rationale..."
          rows={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-denali-500 focus:border-denali-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          Used in the medical necessity letter. Include staging, biopsy results, prior treatments.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-denali-600 text-white rounded-lg font-medium text-sm hover:bg-denali-700 transition-colors"
        >
          Run Coverage Check
        </button>
      </div>
    </div>
  );
}
