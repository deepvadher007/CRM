/**
 * Validates a mapped lead row.
 * 
 * @param {Object} mappedRow - Output of mapExcelRow
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateRow(mappedRow) {
  if (!mappedRow.name || mappedRow.name.trim() === '') {
    return { valid: false, reason: 'Name is required' };
  }
  if (!/^\d{10}$/.test(mappedRow.number)) {
    return { valid: false, reason: 'Invalid phone number' };
  }
  return { valid: true };
}

module.exports = { validateRow };
