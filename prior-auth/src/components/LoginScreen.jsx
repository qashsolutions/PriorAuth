import { useState, useCallback } from 'react';
import { validateNPI } from '../utils/npiValidator';
import { lookupNPI } from '../services/nppes';
import Spinner from './ui/Spinner';

const DEMO_PROVIDER = {
  npi: '0000000000',
  name: 'Dr. Demo Admin',
  credential: 'MD',
  specialty: 'Radiation Oncology',
  address: '100 Demo Way, Austin, TX 78701',
  isDemo: true,
};

export default function LoginScreen({ onLogin }) {
  const [npi, setNpi] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [providerPreview, setProviderPreview] = useState(null);

  const handleNpiChange = useCallback((e) => {
    const value = e.target.value.replace(/\D/g, '');
    setNpi(value);
    setError(null);
    setProviderPreview(null);
  }, []);

  const handleSignIn = useCallback(async () => {
    if (!npi || npi.length < 10) {
      setError('Please enter a 10-digit NPI');
      return;
    }

    const validation = validateNPI(npi);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const info = await lookupNPI(npi);

      if (!info.found) {
        setError('NPI not found in the NPPES registry. Please check and try again.');
        setLoading(false);
        return;
      }

      if (!info.active) {
        setError('This NPI is registered but not currently active.');
        setLoading(false);
        return;
      }

      onLogin({
        npi,
        name: info.name,
        credential: info.credential,
        specialty: info.specialty,
        address: info.address,
        isDemo: false,
      });
    } catch {
      setError('Could not reach the NPPES registry. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [npi, onLogin]);

  const handleDemoMode = useCallback(() => {
    onLogin(DEMO_PROVIDER);
  }, [onLogin]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !loading) handleSignIn();
    },
    [handleSignIn, loading]
  );

  // Preview provider on blur (if valid)
  const handleBlur = useCallback(async () => {
    if (!npi || npi.length < 10) return;
    const validation = validateNPI(npi);
    if (!validation.valid) return;

    try {
      const info = await lookupNPI(npi);
      if (info.found && info.active) {
        setProviderPreview(info);
      }
    } catch {
      // Non-critical — don't block sign-in
    }
  }, [npi]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            <span className="text-denali-600">Denali</span>.health
          </h1>
          <p className="text-sm text-gray-400 font-mono mt-1">
            Medicare PA Assistant — Radiation Oncology
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Provider Sign In</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your NPI to verify your identity and begin.
          </p>

          {/* NPI Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              National Provider Identifier (NPI)
            </label>
            <input
              type="text"
              value={npi}
              onChange={handleNpiChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="1234567890"
              maxLength={10}
              autoFocus
              disabled={loading}
              className={`w-full px-4 py-3 border rounded-lg font-mono text-base tracking-wider ${
                error ? 'border-red-400 bg-red-50' : 'border-gray-300'
              } focus:ring-2 focus:ring-denali-500 focus:border-denali-500 disabled:opacity-50`}
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          {/* Provider preview */}
          {providerPreview && !error && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
              <p className="font-medium text-emerald-800">
                {providerPreview.name}
                {providerPreview.credential && (
                  <span className="text-emerald-600">, {providerPreview.credential}</span>
                )}
              </p>
              <p className="text-emerald-600 text-xs">{providerPreview.specialty}</p>
              {providerPreview.address && (
                <p className="text-emerald-600 text-xs mt-1">{providerPreview.address}</p>
              )}
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            disabled={loading || !npi}
            className="w-full px-4 py-3 bg-denali-600 text-white rounded-lg font-medium text-sm hover:bg-denali-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" label="" />
                Verifying NPI...
              </span>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Demo Mode */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <button
              onClick={handleDemoMode}
              className="text-xs text-gray-400 hover:text-denali-600 transition-colors"
            >
              Enter Demo Mode (no NPI required)
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 mt-6">
          Decision support only — not a substitute for clinical judgment.
        </p>
      </div>
    </div>
  );
}
