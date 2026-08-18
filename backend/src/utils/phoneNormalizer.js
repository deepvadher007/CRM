/**
 * Normalizes a phone number by stripping all non-digit characters
 * and removing country code prefix if present.
 * 
 * @param {string|number} raw - Raw phone number input
 * @returns {string} Normalized 10-digit phone string, or stripped digits if not 10
 */
function normalizePhone(raw) {
  if (raw === null || raw === undefined) return '';
  const digits = String(raw).replace(/[^0-9]/g, '');
  // If 12 digits starting with "91", strip country code
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  // If 11 digits starting with "0" (trunk prefix), strip it
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

module.exports = { normalizePhone };
