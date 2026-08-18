const fc = require('fast-check');
const { normalizePhone } = require('./phoneNormalizer');

describe('Phone Normalizer', () => {
  describe('Property 1: Phone normalization produces valid output', () => {
    /**
     * Validates: Requirements 4.1, 4.2, 4.4
     * For any string input, normalizePhone output contains only digit characters (0-9).
     */
    it('should produce output containing only digits for any string input', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = normalizePhone(input);
          expect(result).toMatch(/^\d*$/);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Phone normalization is idempotent', () => {
    /**
     * **Validates: Requirements 4.5**
     *
     * For any valid phone number input, normalizing the result a second time
     * SHALL produce the same output as the first normalization:
     * normalizePhone(normalizePhone(x)) === normalizePhone(x)
     */
    it('normalizePhone(normalizePhone(x)) === normalizePhone(x) for all string inputs', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const once = normalizePhone(input);
          const twice = normalizePhone(once);
          expect(twice).toBe(once);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('unit tests for example inputs', () => {
    it('should normalize "(+91)-7600331516" to "7600331516"', () => {
      expect(normalizePhone('(+91)-7600331516')).toBe('7600331516');
    });

    it('should return already-10-digit numbers unchanged', () => {
      expect(normalizePhone('9876543210')).toBe('9876543210');
    });

    it('should return empty string for null input', () => {
      expect(normalizePhone(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(normalizePhone(undefined)).toBe('');
    });
  });
});
