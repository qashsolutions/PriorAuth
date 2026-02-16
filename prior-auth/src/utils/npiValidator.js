/**
 * NPI (National Provider Identifier) validation.
 *
 * NPI is a 10-digit number. Validity is checked using the Luhn algorithm
 * with the constant prefix 80840 prepended (per CMS specification).
 *
 * Steps:
 *   1. Prepend "80840" to the 10-digit NPI → 15 digits
 *   2. Apply standard Luhn-10 check on the 15-digit number
 *   3. The check digit (last digit of NPI) must make the Luhn sum ≡ 0 mod 10
 */

export function validateNPI(npi) {
  if (!npi || typeof npi !== 'string') {
    return { valid: false, error: 'NPI is required' };
  }

  const cleaned = npi.replace(/[\s-]/g, '');

  if (!/^\d{10}$/.test(cleaned)) {
    return { valid: false, error: 'NPI must be exactly 10 digits' };
  }

  if (!luhnCheck('80840' + cleaned)) {
    return { valid: false, error: 'NPI check digit is invalid (Luhn-10 failure)' };
  }

  return { valid: true, error: null };
}

function luhnCheck(number) {
  const digits = number.split('').map(Number);
  let sum = 0;

  // Process from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    // Double every second digit from the right (starting at index length-2)
    if ((digits.length - 1 - i) % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }

  return sum % 10 === 0;
}
