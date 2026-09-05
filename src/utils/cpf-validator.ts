/**
 * Utility functions for CPF normalization and Modulo 11 validation.
 * Compatible with backend DocumentUtils.java.
 */

export function normalizeCpf(document: string | null | undefined): string {
  if (!document) return '';
  return document.replace(/[.\-/\s]/g, '').trim();
}

export function isCpfFormat(normalized: string): boolean {
  return /^[0-9]{11}$/.test(normalized);
}

export function isValidCpf(cpf: string | null | undefined): boolean {
  const normalized = normalizeCpf(cpf);

  if (!isCpfFormat(normalized)) {
    return false;
  }

  // Reject sequences with all identical digits (e.g., 111.111.111-11, 000.000.000-00)
  const allSame = normalized.split('').every(c => c === normalized[0]);
  if (allSame) {
    return false;
  }

  const digits = normalized.split('').map(c => parseInt(c, 10));

  // Validate 1st check digit
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += digits[i] * (10 - i);
  }
  const rem1 = sum1 % 11;
  const expectedDigit1 = rem1 < 2 ? 0 : 11 - rem1;
  if (digits[9] !== expectedDigit1) {
    return false;
  }

  // Validate 2nd check digit
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += digits[i] * (11 - i);
  }
  const rem2 = sum2 % 11;
  const expectedDigit2 = rem2 < 2 ? 0 : 11 - rem2;
  if (digits[10] !== expectedDigit2) {
    return false;
  }

  return true;
}
