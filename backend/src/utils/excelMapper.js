const { normalizePhone } = require('./phoneNormalizer');

/**
 * Maps an Excel row object (keyed by column header) to a Lead-compatible object.
 * 
 * @param {Object} row - Raw row from xlsx sheet_to_json
 * @param {string} adminUserId - The importing admin's user ID
 * @returns {Object} Mapped lead data
 */
function mapExcelRow(row, adminUserId) {
  return {
    name: (row['Lead Name'] || '').toString().trim(),
    number: normalizePhone(row['Lead Phone Number']),
    date: parseDate(row['Lead Date']),
    remark: (row['Notes'] || '').toString().trim(),
    serviceType: (row['Service Type'] || '').toString().trim(),
    propertyType: (row['Property Type'] || '').toString().trim(),
    locality: (row['Locality'] || '').toString().trim(),
    configuration: (row['Configuration'] || '').toString().trim(),
    price: (row['Price'] || '').toString().trim(),
    buildingName: (row['Building/Project Name'] || '').toString().trim(),
    address: (row['Address'] || '').toString().trim(),
    // Real-estate fields (optional in the sheet; default to empty/null so
    // existing files without these columns keep importing successfully).
    requirement: (row['Requirement'] || '').toString().trim(),
    budget: (row['Budget'] || '').toString().trim(),
    stage: (row['Stage'] || '').toString().trim(),
    lastContacted: row['Last Contacted'] ? parseOptionalDate(row['Last Contacted']) : null,
    temperature: normalizeTemperature(row['Temperature']),
    user: adminUserId,
    createdBy: adminUserId,
    assignedTo: null,
    assignedBy: null,
    status: 'CNR',
    leadSource: 'Other',
    leadFrom: ''
  };
}

/**
 * Parses an optional date. Unlike parseDate, returns null (not "now") when the
 * value is missing or unparseable, so an absent column stays empty.
 */
function parseOptionalDate(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  const parts = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (parts) {
    const [, day, month, year] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(date.getTime())) return date;
  }
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) return fallback;
  return null;
}

/**
 * Normalizes a temperature cell to 'Hot' | 'Warm' | 'Cold', else '' .
 */
function normalizeTemperature(raw) {
  if (!raw) return '';
  const v = String(raw).trim().toLowerCase();
  if (v === 'hot') return 'Hot';
  if (v === 'warm') return 'Warm';
  if (v === 'cold') return 'Cold';
  return '';
}

/**
 * Parses a date string in DD/MM/YYYY format. Returns current date on failure.
 * 
 * @param {string|number|null|undefined} raw - Raw date value from Excel
 * @returns {Date} Parsed date or current date as fallback
 */
function parseDate(raw) {
  if (!raw) return new Date();
  const str = String(raw).trim();
  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (parts) {
    const [, day, month, year] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(date.getTime())) return date;
  }
  // Try native Date parse as fallback
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) return fallback;
  // Default to current date
  return new Date();
}

module.exports = { mapExcelRow, parseDate, parseOptionalDate, normalizeTemperature };
