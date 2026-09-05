import { isValidCpf, normalizeCpf, isCpfFormat } from '../src/utils/cpf-validator';

describe('CPF Validator Utility', () => {
  describe('normalizeCpf', () => {
    it('should strip dots, dashes, slashes and whitespace', () => {
      expect(normalizeCpf('123.456.789-01')).toBe('12345678901');
      expect(normalizeCpf(' 123.456.789/01 ')).toBe('12345678901');
      expect(normalizeCpf('12345678901')).toBe('12345678901');
    });

    it('should handle null or undefined', () => {
      expect(normalizeCpf(null)).toBe('');
      expect(normalizeCpf(undefined)).toBe('');
      expect(normalizeCpf('')).toBe('');
    });
  });

  describe('isCpfFormat', () => {
    it('should return true for 11 digits', () => {
      expect(isCpfFormat('12345678901')).toBe(true);
    });

    it('should return false for invalid lengths or non-digits', () => {
      expect(isCpfFormat('1234567890')).toBe(false);
      expect(isCpfFormat('123456789012')).toBe(false);
      expect(isCpfFormat('1234567890a')).toBe(false);
      expect(isCpfFormat('')).toBe(false);
    });
  });

  describe('isValidCpf', () => {
    it('should return true for valid CPFs', () => {
      // Valid known test CPFs
      expect(isValidCpf('52998224725')).toBe(true);
      expect(isValidCpf('529.982.247-25')).toBe(true);
      expect(isValidCpf('88544977030')).toBe(true);
      expect(isValidCpf('885.449.770-30')).toBe(true);
    });

    it('should return false for invalid check digits', () => {
      expect(isValidCpf('52998224724')).toBe(false);
      expect(isValidCpf('88544977052')).toBe(false);
      expect(isValidCpf('12345678901')).toBe(false);
    });

    it('should reject sequences with all identical digits', () => {
      expect(isValidCpf('000.000.000-00')).toBe(false);
      expect(isValidCpf('111.111.111-11')).toBe(false);
      expect(isValidCpf('222.222.222-22')).toBe(false);
      expect(isValidCpf('333.333.333-33')).toBe(false);
      expect(isValidCpf('444.444.444-44')).toBe(false);
      expect(isValidCpf('555.555.555-55')).toBe(false);
      expect(isValidCpf('666.666.666-66')).toBe(false);
      expect(isValidCpf('777.777.777-77')).toBe(false);
      expect(isValidCpf('888.888.888-88')).toBe(false);
      expect(isValidCpf('999.999.999-99')).toBe(false);
    });

    it('should return false for null, undefined or empty input', () => {
      expect(isValidCpf(null)).toBe(false);
      expect(isValidCpf(undefined)).toBe(false);
      expect(isValidCpf('')).toBe(false);
    });
  });
});
