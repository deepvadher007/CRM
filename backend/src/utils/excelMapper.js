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
 * Supports the same formats as parseDate (serial numbers, DD/MM/YYYY, ISO, etc.)
 */
function parseOptionalDate(raw) {
  if (!raw && raw !== 0) return null;

  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    return utcDate(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate());
  }

  if (typeof raw === 'number') {
    if (raw >= 1 && raw <= 2958465) return excelSerialToDate(raw);
    return null;
  }

  const str = String(raw).trim();
  if (!str) return null;

  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = utcDate(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const d = utcDate(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
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
 * Converts an Excel serial date number to a JavaScript Date.
 *
 * Excel stores dates as the number of days since 1900-01-00 (with a deliberate
 * off-by-one / leap-year bug that treats 1900 as a leap year).
 * The standard adjustment is: Unix epoch = Excel serial - 25569 days.
 * We parse it in UTC then rebuild as a local midnight date to avoid timezone
 * shifts changing the calendar day.
 *
 * @param {number} serial - Excel date serial (e.g. 46281)
 * @returns {Date} Local-midnight Date
 */
const XLSX = require('xlsx');

function excelSerialToDate(serial) {
  // Use the xlsx library's own serial→date-code parser, which returns the
  // calendar components (y/m/d) directly with no timezone math. This avoids the
  // off-by-one errors that arise from manual epoch/timezone arithmetic and is
  // stable regardless of the server timezone. We then build a UTC-midnight Date
  // so the stored value is a timezone-independent, date-only representation.
  try {
    const parsed = XLSX.SSF && XLSX.SSF.parse_date_code
      ? XLSX.SSF.parse_date_code(serial)
      : null;
    if (parsed && parsed.y) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    }
  } catch (e) {
    // fall through to manual conversion
  }
  // Fallback: manual conversion (25569 = days from 1900-01-01 to 1970-01-01)
  const days = Math.round(serial - 25569);
  const utcDate = new Date(days * 86400 * 1000);
  return new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate()));
}

/**
 * Builds a timezone-independent UTC-midnight Date from calendar parts.
 * @param {number} year @param {number} monthIndex (0-based) @param {number} day
 */
function utcDate(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day));
}

/**
 * Parses a date string in DD/MM/YYYY format. Returns current date on failure.
 *
 * Handles:
 *  - Excel serial numbers (e.g. 46281 → 2026-07-07)
 *  - JS Date objects (passthrough)
 *  - DD/MM/YYYY and DD-MM-YYYY strings
 *  - YYYY-MM-DD strings (ISO)
 *  - Fallback: native Date parse
 *  - Missing/falsy: returns today
 *
 * @param {string|number|Date|null|undefined} raw - Raw date value from Excel
 * @returns {Date} Parsed date or current date as fallback
 */
function parseDate(raw) {
  if (!raw && raw !== 0) return new Date();

  // If xlsx returned a real JS Date (cellDates: true or already a Date).
  // xlsx date cells are stored as UTC; read UTC parts to get the intended day.
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return new Date();
    return utcDate(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate());
  }

  // Excel serial numbers in a plausible date range (1 = 1900-01-01,
  // ~2958465 = 9999-12-31). Pass the RAW fractional serial to excelSerialToDate
  // so the xlsx SSF parser can resolve the correct calendar day (rounding here
  // would shift dates whose serial carries a time-of-day fraction).
  if (typeof raw === 'number') {
    if (raw >= 1 && raw <= 2958465) {
      return excelSerialToDate(raw);
    }
    return new Date(); // out-of-range number → fallback
  }

  const str = String(raw).trim();
  if (!str) return new Date();

  // DD/MM/YYYY or DD-MM-YYYY → UTC-midnight (timezone-independent)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = utcDate(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD (ISO date-only) → UTC-midnight
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const d = utcDate(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback: native Date parse (may timezone-shift, but better than nothing)
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) return fallback;

  return new Date();
}

module.exports = { mapExcelRow, parseDate, parseOptionalDate, normalizeTemperature, excelSerialToDate };
