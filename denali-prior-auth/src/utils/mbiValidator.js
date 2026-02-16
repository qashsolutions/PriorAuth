/**
 * Medicare Beneficiary Identifier (MBI) validation.
 *
 * MBI format (11 characters): C A AN N AA N AA NN
 *   Position 1:   C  = 1-9 (no 0)
 *   Position 2:   A  = A-Z excluding S,L,O,I,B,Z
 *   Position 3:   AN = alphanumeric (same exclusions)
 *   Position 4:   N  = 0-9
 *   Position 5-6: AA = alpha (same exclusions)
 *   Position 7:   N  = 0-9
 *   Position 8-9: AA = alpha (same exclusions)
 *   Position 10-11: NN = 0-9
 *
 * Excluded letters: S, L, O, I, B, Z (to avoid confusion with digits)
 */

const ALPHA = '[AC-HJKMNP-RT-WY]';
const NUMERIC = '[0-9]';
const ALPHANUMERIC = `[0-9AC-HJKMNP-RT-WY]`;

const MBI_PATTERN = new RegExp(
  `^[1-9]${ALPHA}${ALPHANUMERIC}${NUMERIC}${ALPHA}${ALPHA}${NUMERIC}${ALPHA}${ALPHA}${NUMERIC}${NUMERIC}$`
);

export function validateMBI(mbi) {
  if (!mbi || typeof mbi !== 'string') {
    return { valid: false, error: 'MBI is required' };
  }

  const cleaned = mbi.replace(/[-\s]/g, '').toUpperCase();

  if (cleaned.length !== 11) {
    return { valid: false, error: `MBI must be 11 characters (got ${cleaned.length})` };
  }

  if (!MBI_PATTERN.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid MBI format. Expected pattern: 1AN-A9AN-AA99 (letters exclude S,L,O,I,B,Z)',
    };
  }

  return { valid: true, error: null, formatted: formatMBI(cleaned) };
}

export function formatMBI(mbi) {
  const c = mbi.replace(/[-\s]/g, '').toUpperCase();
  if (c.length !== 11) return mbi;
  return `${c.slice(0, 4)}-${c.slice(4, 7)}-${c.slice(7)}`;
}
