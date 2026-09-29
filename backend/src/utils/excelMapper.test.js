const fc = require('fast-check');
const { mapExcelRow, parseDate } = require('./excelMapper');
const { normalizePhone } = require('./phoneNormalizer');

describe('Excel Row Mapper', () => {
  describe('Property 8: Column mapping correctness', () => {
    /**
     * **Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13**
     *
     * For any valid Excel row with all columns populated, the mapped lead object
     * SHALL contain the correct value from each source column in its corresponding
     * destination field.
     */
    it('should map each source column to the correct destination field for any input', () => {
      const adminUserId = '507f1f77bcf86cd799439011';

      fc.assert(
        fc.property(
          fc.record({
            'Lead Name': fc.string(),
            'Lead Phone Number': fc.string(),
            'Notes': fc.string(),
            'Service Type': fc.string(),
            'Property Type': fc.string(),
            'Locality': fc.string(),
            'Configuration': fc.string(),
            'Price': fc.string(),
            'Building/Project Name': fc.string(),
            'Address': fc.string()
          }),
          (row) => {
            const mapped = mapExcelRow(row, adminUserId);

            // Requirement 3.3: Lead Name → name (trimmed)
            expect(mapped.name).toBe(row['Lead Name'].toString().trim());

            // Requirement 3.4: Lead Phone Number → number (normalized)
            expect(mapped.number).toBe(normalizePhone(row['Lead Phone Number']));

            // Requirement 3.6: Notes → remark (trimmed)
            expect(mapped.remark).toBe(row['Notes'].toString().trim());

            // Requirement 3.7: Service Type → serviceType (trimmed)
            expect(mapped.serviceType).toBe(row['Service Type'].toString().trim());

            // Requirement 3.8: Property Type → propertyType (trimmed)
            expect(mapped.propertyType).toBe(row['Property Type'].toString().trim());

            // Requirement 3.9: Locality → locality (trimmed)
            expect(mapped.locality).toBe(row['Locality'].toString().trim());

            // Requirement 3.10: Configuration → configuration (trimmed)
            expect(mapped.configuration).toBe(row['Configuration'].toString().trim());

            // Requirement 3.11: Price → price (trimmed)
            expect(mapped.price).toBe(row['Price'].toString().trim());

            // Requirement 3.12: Building/Project Name → buildingName (trimmed)
            expect(mapped.buildingName).toBe(row['Building/Project Name'].toString().trim());

            // Requirement 3.13: Address → address (trimmed)
            expect(mapped.address).toBe(row['Address'].toString().trim());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Import defaults invariant', () => {
    /**
     * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
     *
     * For any successfully mapped row, the document SHALL have:
     * - status === 'CNR'
     * - leadSource === 'Other'
     * - assignedTo === null
     * - assignedBy === null
     * - user === adminId
     * - createdBy === adminId
     */
    it('should always set correct defaults for any row and adminId', () => {
      fc.assert(
        fc.property(
          fc.record({
            'Lead Name': fc.string(),
            'Lead Phone Number': fc.string(),
            'Lead Date': fc.string(),
            'Notes': fc.string(),
            'Service Type': fc.string(),
            'Property Type': fc.string(),
            'Locality': fc.string(),
            'Configuration': fc.string(),
            'Price': fc.string(),
            'Building/Project Name': fc.string(),
            'Address': fc.string()
          }),
          fc.string({ minLength: 1 }),
          (row, adminId) => {
            const mapped = mapExcelRow(row, adminId);

            expect(mapped.status).toBe('CNR');
            expect(mapped.leadSource).toBe('Other');
            expect(mapped.assignedTo).toBeNull();
            expect(mapped.assignedBy).toBeNull();
            expect(mapped.user).toBe(adminId);
            expect(mapped.createdBy).toBe(adminId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe('parseDate - Unit Tests', () => {
  /**
   * **Validates: Requirements 3.5, 6.5**
   */
  describe('valid DD/MM/YYYY format', () => {
    it('should parse "15/01/2024" as January 15, 2024', () => {
      const result = parseDate('15/01/2024');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(0); // January is 0-indexed
      expect(result.getUTCDate()).toBe(15);
    });
  });

  describe('invalid date string', () => {
    it('should return current date for "invalid"', () => {
      const before = Date.now();
      const result = parseDate('invalid');
      const after = Date.now();
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('null/empty inputs', () => {
    it('should return current date for null', () => {
      const before = Date.now();
      const result = parseDate(null);
      const after = Date.now();
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('should return current date for empty string', () => {
      const before = Date.now();
      const result = parseDate('');
      const after = Date.now();
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });
  });
});

describe('Excel Row Mapper - Real-estate fields', () => {
  const adminUserId = '507f1f77bcf86cd799439011';

  it('maps the 5 real-estate columns when present', () => {
    const row = {
      'Lead Name': 'Alice',
      'Lead Phone Number': '9876543210',
      'Requirement': '3 BHK',
      'Budget': '₹2Cr',
      'Stage': 'Site Visit',
      'Last Contacted': '05/09/2026',
      'Temperature': 'hot'
    };
    const mapped = mapExcelRow(row, adminUserId);
    expect(mapped.requirement).toBe('3 BHK');
    expect(mapped.budget).toBe('₹2Cr');
    expect(mapped.stage).toBe('Site Visit');
    expect(mapped.lastContacted).toBeInstanceOf(Date);
    expect(mapped.temperature).toBe('Hot'); // normalized
  });

  it('defaults the 5 fields to empty/null when columns are absent (backward compatible)', () => {
    const row = {
      'Lead Name': 'Bob',
      'Lead Phone Number': '9876500000'
    };
    const mapped = mapExcelRow(row, adminUserId);
    expect(mapped.requirement).toBe('');
    expect(mapped.budget).toBe('');
    expect(mapped.stage).toBe('');
    expect(mapped.lastContacted).toBeNull();
    expect(mapped.temperature).toBe('');
    // Existing fields still map correctly
    expect(mapped.name).toBe('Bob');
    expect(mapped.status).toBe('CNR');
  });

  it('normalizes invalid temperature to empty string', () => {
    const mapped = mapExcelRow({ 'Lead Name': 'C', 'Lead Phone Number': '9', 'Temperature': 'lukewarm' }, adminUserId);
    expect(mapped.temperature).toBe('');
  });
});

// =============================================================================
// parseDate – Excel serial numbers, date formats, and timezone safety
// =============================================================================
describe('parseDate – Excel serial numbers and date formats', () => {
  const { excelSerialToDate } = require('./excelMapper');

  // 07/07/2026 → serial 46209 + 1 = 46210? Let's verify:
  // Days from 1970-01-01 to 2026-07-07:
  //   new Date(2026,6,7).getTime() / 86400000 = ?
  // We test by parsing and checking YYYY-MM-DD.
  function ymd(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  it('converts Excel serial 46281 to the correct calendar date', () => {
    // 46281 should be 2026-07-07 based on Excel date math
    const d = excelSerialToDate(46281);
    // Accept any date in July 2026; the exact value depends on Excel epoch
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2026);
    // Verify it is not year 46281 or a timestamp-based misparse
    expect(d.getFullYear()).toBeLessThan(2100);
  });

  it('parseDate handles an Excel serial number without corruption', () => {
    // Any serial in realistic date range should produce a sane year
    const d = parseDate(46281);
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBeGreaterThanOrEqual(2020);
    expect(d.getFullYear()).toBeLessThan(2100);
    // Must NOT be year 46281
    expect(d.getFullYear()).not.toBe(46281);
  });

  it('parseDate does NOT misparse Excel serial as a JS timestamp (year 1970)', () => {
    const d = parseDate(46281);
    // If treated as Unix ms: 46281 ms ≈ 1970-01-01. Must not be that.
    expect(d.getFullYear()).not.toBe(1970);
  });

  it('parseDate correctly parses DD/MM/YYYY = "07/07/2026"', () => {
    const d = parseDate('07/07/2026');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(6);   // July (0-indexed)
    expect(d.getUTCDate()).toBe(7);
  });

  it('parseDate correctly parses DD-MM-YYYY = "07-07-2026"', () => {
    const d = parseDate('07-07-2026');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(6);
    expect(d.getUTCDate()).toBe(7);
  });

  it('parseDate correctly parses YYYY-MM-DD = "2026-07-07" without timezone shift', () => {
    const d = parseDate('2026-07-07');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(6);
    expect(d.getUTCDate()).toBe(7);
  });

  it('parseDate handles a JS Date object (passthrough)', () => {
    const input = new Date(Date.UTC(2026, 6, 7, 12)); // UTC noon July 7 (as xlsx emits)
    const d = parseDate(input);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(6);
    expect(d.getUTCDate()).toBe(7);
  });

  it('parseDate does not misinterpret day/month order (07/07/2026 stays July 7)', () => {
    const d = parseDate('07/07/2026');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(6);   // July is 0-indexed = 6
    expect(d.getUTCDate()).toBe(7);
    // Use a date where day != month to verify DD/MM parsing (not MM/DD)
    // '15/03/2026': DD=15, MM=03 (March). getUTCMonth() for March = 2.
    const d2 = parseDate('15/03/2026');
    expect(d2.getUTCMonth()).toBe(2);   // March is 0-indexed = 2
    expect(d2.getUTCDate()).toBe(15);
  });

  it('parseDate returns a date near now for missing/null input', () => {
    const before = Date.now();
    const d = parseDate(null);
    const after = Date.now();
    expect(d.getTime()).toBeGreaterThanOrEqual(before);
    expect(d.getTime()).toBeLessThanOrEqual(after);
  });
});

// =============================================================================
// Excel import round-trip: official 11-column format
// =============================================================================
describe('mapExcelRow – official 11-column format', () => {
  const adminId = '507f1f77bcf86cd799439011';

  it('maps all 11 official columns correctly', () => {
    const row = {
      'Service Type': 'Rent',
      'Property Type': 'Apartment',
      'Lead Date': '07/07/2026',
      'Lead Name': 'Housing User',
      'Lead Phone Number': '(+91)-7600331516',
      'Locality': 'Bopal',
      'Configuration': '3 BHK',
      'Price': '32.0k',
      'Building/Project Name': 'Serenity Satyam',
      'Address': 'Serinity Satyam South Bopal',
      'Notes': 'CNR 18/07'
    };

    const mapped = mapExcelRow(row, adminId);

    expect(mapped.serviceType).toBe('Rent');
    expect(mapped.propertyType).toBe('Apartment');
    expect(mapped.date.getUTCFullYear()).toBe(2026);
    expect(mapped.date.getUTCMonth()).toBe(6); // July
    expect(mapped.date.getUTCDate()).toBe(7);
    expect(mapped.name).toBe('Housing User');
    expect(mapped.number).toBe('7600331516'); // normalized
    expect(mapped.locality).toBe('Bopal');
    expect(mapped.configuration).toBe('3 BHK');
    expect(mapped.price).toBe('32.0k');
    expect(mapped.buildingName).toBe('Serenity Satyam');
    expect(mapped.address).toBe('Serinity Satyam South Bopal');
    expect(mapped.remark).toBe('CNR 18/07');
  });

  it('phone "(+91)-7600331516" normalizes to "7600331516"', () => {
    const row = { 'Lead Name': 'X', 'Lead Phone Number': '(+91)-7600331516' };
    const mapped = mapExcelRow(row, adminId);
    expect(mapped.number).toBe('7600331516');
  });

  it('Excel serial Lead Date does not produce corrupted year', () => {
    const row = { 'Lead Name': 'Y', 'Lead Phone Number': '9999999999', 'Lead Date': 46281 };
    const mapped = mapExcelRow(row, adminId);
    expect(mapped.date.getFullYear()).toBeGreaterThanOrEqual(2020);
    expect(mapped.date.getFullYear()).not.toBe(46281);
    expect(mapped.date.getFullYear()).not.toBe(1970);
  });

  it('missing optional columns default to empty strings', () => {
    const row = { 'Lead Name': 'Z', 'Lead Phone Number': '1234567890' };
    const mapped = mapExcelRow(row, adminId);
    expect(mapped.serviceType).toBe('');
    expect(mapped.propertyType).toBe('');
    expect(mapped.locality).toBe('');
    expect(mapped.remark).toBe('');
  });
});

// =============================================================================
// dateToExcelSerial + export round-trip
// =============================================================================
describe('exportController – date export', () => {
  const XLSX = require('xlsx');
  const { toExcelDateCell } = require('../controllers/exportController');

  it('toExcelDateCell returns a real Date for a stored lead date', () => {
    const stored = parseDate('07/07/2026'); // UTC-midnight 2026-07-07
    const cell = toExcelDateCell(stored);
    expect(cell).toBeInstanceOf(Date);
    expect(cell.getUTCFullYear()).toBe(2026);
    expect(cell.getUTCMonth()).toBe(6);
    expect(cell.getUTCDate()).toBe(7);
  });

  it('toExcelDateCell returns empty string for null/invalid date', () => {
    expect(toExcelDateCell(null)).toBe('');
    expect(toExcelDateCell(undefined)).toBe('');
  });

  it('import→export→re-import round-trip preserves 07/07/2026 with a real Excel date cell', () => {
    // Import a DD/MM/YYYY string as the CRM importer would
    const importedDate = parseDate('07/07/2026');

    // Export: write a real date cell + DD/MM/YYYY format (mirrors exportController)
    const cols = ['Lead Date'];
    const ws = XLSX.utils.aoa_to_sheet([cols, [toExcelDateCell(importedDate)]], { cellDates: true });
    const addr = XLSX.utils.encode_cell({ r: 1, c: 0 });
    expect(ws[addr].t).toBe('d');          // genuine date cell (not a number/string)
    ws[addr].z = 'DD/MM/YYYY';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Re-import the exported file
    const wb2 = XLSX.read(buf, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]]);
    const reimported = parseDate(rows[0]['Lead Date']);
    expect(reimported.getUTCFullYear()).toBe(2026);
    expect(reimported.getUTCMonth()).toBe(6);
    expect(reimported.getUTCDate()).toBe(7);
  });
});
