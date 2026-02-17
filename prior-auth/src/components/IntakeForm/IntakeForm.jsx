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

const DEMO_CASE_DATA = {
  // Patient — Stedi CMS predefined test subscriber (must match exactly)
  // See: https://www.stedi.com/docs/api-reference/healthcare/mock-requests-eligibility-checks
  mbi: '1AA2-CC3-DD45',
  firstName: 'Jane',
  lastName: 'Doe',
  dob: '1900-01-01',
  // Provider — Luhn-valid NPI with pre-filled info (any NPI works for Stedi test mode)
  npi: '1497758544',
  practiceZip: '78701',
  providerName: 'Dr. Sarah Chen, MD',
  providerSpecialty: 'Radiation Oncology',
  providerAddress: '1201 Medical Pkwy, Austin, TX 78701',
  // Clinical — IMRT for lung cancer (common rad-onc scenario)
  icd10: 'C34.90',
  icd10Description: 'Malignant neoplasm of unspecified part of unspecified bronchus or lung',
  cpt: '77385',
  placeOfService: '22',
  clinicalSummary:
    'Patient diagnosed with Stage IIIA non-small cell lung cancer (adenocarcinoma) confirmed ' +
    'by CT-guided biopsy. PET/CT shows FDG-avid right upper lobe mass (4.2 cm) with ' +
    'ipsilateral mediastinal lymph node involvement. No distant metastases. ECOG performance ' +
    'status 1. Treatment plan: concurrent chemoradiation with IMRT (60 Gy in 30 fractions) ' +
    'followed by durvalumab consolidation per PACIFIC protocol. IMRT selected over 3D-CRT ' +
    'to minimize dose to heart, esophagus, and contralateral lung given proximity to ' +
    'mediastinal structures.',
};

export default function IntakeForm({ onSubmit, isDemo }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(isDemo ? DEMO_CASE_DATA : INITIAL_DATA);

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
