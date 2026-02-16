import { useState } from 'react';
import PatientStep from './PatientStep';
import ProviderStep from './ProviderStep';
import ClinicalStep from './ClinicalStep';
import StepIndicator from '../ui/StepIndicator';

const STEPS = ['Patient', 'Provider', 'Clinical'];

const INITIAL_DATA = {
  // Patient
  mbi: '',
  firstName: '',
  lastName: '',
  dob: '',
  // Provider
  npi: '',
  practiceZip: '',
  providerName: '',
  providerSpecialty: '',
  providerAddress: '',
  // Clinical
  icd10: '',
  icd10Description: '',
  cpt: '',
  placeOfService: '',
  clinicalSummary: '',
};

export default function IntakeForm({ onSubmit }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(INITIAL_DATA);

  function handleSubmit() {
    onSubmit(data);
  }

  return (
    <div className="max-w-xl mx-auto">
      <StepIndicator steps={STEPS} current={step} />

      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {step === 0 && (
          <PatientStep
            data={data}
            onChange={setData}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <ProviderStep
            data={data}
            onChange={setData}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <ClinicalStep
            data={data}
            onChange={setData}
            onSubmit={handleSubmit}
            onBack={() => setStep(1)}
          />
        )}
      </div>
    </div>
  );
}
