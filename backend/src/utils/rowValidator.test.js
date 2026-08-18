const { validateRow } = require('./rowValidator');
const fc = require('fast-check');

describe('validateRow', () => {
  it('returns valid for a row with non-empty name and 10-digit number', () => {
    const result = validateRow({ name: 'John Doe', number: '7600331516' });
    expect(result).toEqual({ valid: true });
  });

  it('returns invalid with reason when name is empty', () => {
    const result = validateRow({ name: '', number: '7600331516' });
    expect(result).toEqual({ valid: false, reason: 'Name is required' });
  });

  it('returns invalid with reason when name is only whitespace', () => {
    const result = validateRow({ name: '   ', number: '7600331516' });
    expect(result).toEqual({ valid: false, reason: 'Name is required' });
  });

  it('returns invalid with reason when name is null/undefined', () => {
    const result = validateRow({ name: null, number: '7600331516' });
    expect(result).toEqual({ valid: false, reason: 'Name is required' });
  });

  it('returns invalid with reason when number is not 10 digits', () => {
    const result = validateRow({ name: 'John', number: '12345' });
    expect(result).toEqual({ valid: false, reason: 'Invalid phone number' });
  });

  it('returns invalid when number contains non-digit characters', () => {
    const result = validateRow({ name: 'John', number: '760033151a' });
    expect(result).toEqual({ valid: false, reason: 'Invalid phone number' });
  });

  it('returns invalid when number is more than 10 digits', () => {
    const result = validateRow({ name: 'John', number: '76003315161' });
    expect(result).toEqual({ valid: false, reason: 'Invalid phone number' });
  });

  it('returns invalid when number is empty string', () => {
    const result = validateRow({ name: 'John', number: '' });
    expect(result).toEqual({ valid: false, reason: 'Invalid phone number' });
  });

  it('prioritizes name validation over number validation', () => {
    const result = validateRow({ name: '', number: '123' });
    expect(result).toEqual({ valid: false, reason: 'Name is required' });
  });
});

/**
 * Property 5: Row validation rejects invalid names and numbers
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */
describe('Property 5: Row validation rejects invalid names and numbers', () => {
  it('rejects any row with empty/whitespace-only name', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', ' ', '  ', '\t', '\n'),
        fc.string(),
        (name, number) => {
          const result = validateRow({ name, number });
          expect(result).toEqual({ valid: false, reason: 'Name is required' });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects any row with a non-10-digit phone number', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        fc.string().filter(s => !/^\d{10}$/.test(s)),
        (name, number) => {
          const result = validateRow({ name, number });
          expect(result).toEqual({ valid: false, reason: 'Invalid phone number' });
        }
      ),
      { numRuns: 100 }
    );
  });
});
