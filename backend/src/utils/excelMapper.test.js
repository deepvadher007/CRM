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
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January is 0-indexed
      expect(result.getDate()).toBe(15);
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
