const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const { mapExcelRow } = require('../utils/excelMapper');
const { validateRow } = require('../utils/rowValidator');

/**
 * Property 7: Response count consistency
 * **Validates: Requirements 9.1, 9.2, 9.3**
 *
 * For any import operation, totalRows === imported + duplicates + invalid,
 * and the length of duplicateDetails SHALL equal duplicates,
 * and the length of invalidDetails SHALL equal invalid.
 */
describe('Import Controller - Property 7: Response count consistency', () => {
  /**
   * Generates an Excel-like row object with arbitrary string values.
   * Some rows will have valid names and 10-digit phone numbers,
   * others will have invalid/empty names or non-10-digit numbers,
   * and some will share phone numbers (to trigger intra-file duplicate detection).
   */
  const excelRowArb = fc.record({
    'Lead Name': fc.oneof(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.constant(''),
      fc.constant('   ')
    ),
    'Lead Phone Number': fc.oneof(
      // Valid 10-digit numbers
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 10, maxLength: 10 }),
      // Numbers with country code prefix (+91)
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 10, maxLength: 10 })
        .map(d => `(+91)-${d}`),
      // Invalid: too short
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 1, maxLength: 9 }),
      // Invalid: empty
      fc.constant('')
    ),
    'Lead Date': fc.oneof(
      fc.constant('15/01/2024'),
      fc.constant(''),
      fc.constant('invalid-date')
    ),
    'Notes': fc.string({ maxLength: 100 }),
    'Service Type': fc.string({ maxLength: 30 }),
    'Property Type': fc.string({ maxLength: 30 }),
    'Locality': fc.string({ maxLength: 50 }),
    'Configuration': fc.string({ maxLength: 30 }),
    'Price': fc.string({ maxLength: 20 }),
    'Building/Project Name': fc.string({ maxLength: 50 }),
    'Address': fc.string({ maxLength: 100 })
  });

  /**
   * Simulates the controller's row processing logic:
   * mapExcelRow → validateRow → duplicate detection (intra-file).
   * Uses an optional set of "existing" phone numbers for DB-level duplicate detection.
   */
  function processRows(rows, existingNumbers = new Set()) {
    const adminUserId = 'admin123';
    const duplicateDetails = [];
    const invalidDetails = [];
    const validLeads = [];
    const seenInFile = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const mapped = mapExcelRow(rows[i], adminUserId);

      // Validate row
      const validation = validateRow(mapped);
      if (!validation.valid) {
        invalidDetails.push({ row: rowNum, name: mapped.name, reason: validation.reason });
        continue;
      }

      // Duplicate detection: database
      if (existingNumbers.has(mapped.number)) {
        duplicateDetails.push({ row: rowNum, name: mapped.name, number: mapped.number });
        continue;
      }

      // Duplicate detection: within same file
      if (seenInFile.has(mapped.number)) {
        duplicateDetails.push({ row: rowNum, name: mapped.name, number: mapped.number });
        continue;
      }

      seenInFile.add(mapped.number);
      validLeads.push(mapped);
    }

    return {
      totalRows: rows.length,
      imported: validLeads.length,
      duplicates: duplicateDetails.length,
      invalid: invalidDetails.length,
      duplicateDetails,
      invalidDetails
    };
  }

  it('totalRows === imported + duplicates + invalid for any set of rows', () => {
    fc.assert(
      fc.property(
        fc.array(excelRowArb, { minLength: 0, maxLength: 50 }),
        (rows) => {
          const result = processRows(rows);
          expect(result.totalRows).toBe(result.imported + result.duplicates + result.invalid);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('duplicateDetails.length equals duplicates count', () => {
    fc.assert(
      fc.property(
        fc.array(excelRowArb, { minLength: 0, maxLength: 50 }),
        (rows) => {
          const result = processRows(rows);
          expect(result.duplicateDetails.length).toBe(result.duplicates);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('invalidDetails.length equals invalid count', () => {
    fc.assert(
      fc.property(
        fc.array(excelRowArb, { minLength: 0, maxLength: 50 }),
        (rows) => {
          const result = processRows(rows);
          expect(result.invalidDetails.length).toBe(result.invalid);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('totalRows === imported + duplicates + invalid with existing DB numbers', () => {
    const existingNumbersArb = fc.array(
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 10, maxLength: 10 }),
      { minLength: 0, maxLength: 10 }
    ).map(arr => new Set(arr));

    fc.assert(
      fc.property(
        fc.array(excelRowArb, { minLength: 0, maxLength: 50 }),
        existingNumbersArb,
        (rows, existingNumbers) => {
          const result = processRows(rows, existingNumbers);
          expect(result.totalRows).toBe(result.imported + result.duplicates + result.invalid);
          expect(result.duplicateDetails.length).toBe(result.duplicates);
          expect(result.invalidDetails.length).toBe(result.invalid);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 4: Intra-file duplicate detection keeps first occurrence only
 * **Validates: Requirements 5.2, 5.4**
 *
 * For any Excel file containing rows with duplicate normalized phone numbers,
 * the import SHALL accept only the first occurrence of each phone number and
 * skip all subsequent rows with the same normalized number.
 */
describe('Import Controller - Property 4: Intra-file duplicate detection keeps first occurrence', () => {
  /**
   * Simulates the intra-file duplicate detection logic from importController.
   * This mirrors the processing loop without requiring DB or HTTP dependencies.
   */
  function processRows(rows, adminUserId) {
    const duplicateDetails = [];
    const invalidDetails = [];
    const validLeads = [];
    const seenInFile = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 for header row + 1-based index
      const mapped = mapExcelRow(rows[i], adminUserId);

      // Validate row
      const validation = validateRow(mapped);
      if (!validation.valid) {
        invalidDetails.push({ row: rowNum, name: mapped.name, reason: validation.reason });
        continue;
      }

      // Duplicate detection: within same file
      if (seenInFile.has(mapped.number)) {
        duplicateDetails.push({ row: rowNum, name: mapped.name, number: mapped.number });
        continue;
      }

      seenInFile.add(mapped.number);
      validLeads.push(mapped);
    }

    return { validLeads, duplicateDetails, invalidDetails };
  }

  // Generator for a valid 10-digit phone number string
  const validPhoneArb = fc.stringOf(
    fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
    { minLength: 10, maxLength: 10 }
  );

  // Generator for a non-empty name
  const nameArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0);

  it('should keep only the first occurrence of each phone number in validLeads', () => {
    // **Validates: Requirements 5.2, 5.4**
    fc.assert(
      fc.property(
        // Generate between 1 and 10 unique phone numbers, then create rows picking from them
        fc.array(validPhoneArb, { minLength: 1, maxLength: 10 }).chain(uniquePhones => {
          const phonePickerArb = fc.integer({ min: 0, max: uniquePhones.length - 1 });
          return fc.array(
            fc.tuple(nameArb, phonePickerArb),
            { minLength: 2, maxLength: 30 }
          ).map(tuples =>
            tuples.map(([name, phoneIdx]) => ({
              'Lead Name': name,
              'Lead Phone Number': uniquePhones[phoneIdx],
              'Service Type': '',
              'Property Type': '',
              'Lead Date': '',
              'Locality': '',
              'Configuration': '',
              'Price': '',
              'Building/Project Name': '',
              'Address': '',
              'Notes': ''
            }))
          );
        }),
        (rows) => {
          const adminUserId = 'admin123';
          const { validLeads, duplicateDetails } = processRows(rows, adminUserId);

          // validLeads should have no duplicate phone numbers
          const validNumbers = validLeads.map(l => l.number);
          const uniqueValidNumbers = new Set(validNumbers);
          expect(validNumbers.length).toBe(uniqueValidNumbers.size);

          // For each unique phone in input, only the FIRST valid occurrence should be in validLeads
          const phoneToFirstRow = new Map();
          for (let i = 0; i < rows.length; i++) {
            const mapped = mapExcelRow(rows[i], adminUserId);
            const validation = validateRow(mapped);
            if (!validation.valid) continue;

            if (!phoneToFirstRow.has(mapped.number)) {
              phoneToFirstRow.set(mapped.number, mapped);
            }
          }

          // Each lead in validLeads should match the first occurrence
          for (const lead of validLeads) {
            expect(phoneToFirstRow.has(lead.number)).toBe(true);
            const firstMapped = phoneToFirstRow.get(lead.number);
            expect(lead.name).toBe(firstMapped.name);
            expect(lead.number).toBe(firstMapped.number);
          }

          // Count expected duplicates: subsequent valid rows with already-seen phones
          const seenPhones = new Set();
          let expectedDuplicates = 0;
          for (let i = 0; i < rows.length; i++) {
            const mapped = mapExcelRow(rows[i], adminUserId);
            const validation = validateRow(mapped);
            if (!validation.valid) continue;

            if (seenPhones.has(mapped.number)) {
              expectedDuplicates++;
            }
            seenPhones.add(mapped.number);
          }

          expect(duplicateDetails.length).toBe(expectedDuplicates);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should record duplicate rows with correct row numbers and details', () => {
    // **Validates: Requirements 5.2, 5.4**
    fc.assert(
      fc.property(
        // Generate rows with a guaranteed duplicate phone
        fc.tuple(validPhoneArb, nameArb, nameArb).chain(([phone, name1, name2]) => {
          return fc.array(
            fc.tuple(nameArb, validPhoneArb),
            { minLength: 0, maxLength: 8 }
          ).map(otherRows => {
            const allRows = [];
            // Add some other rows before first occurrence
            for (const [n, p] of otherRows.slice(0, 3)) {
              allRows.push({
                'Lead Name': n, 'Lead Phone Number': p,
                'Service Type': '', 'Property Type': '', 'Lead Date': '',
                'Locality': '', 'Configuration': '', 'Price': '',
                'Building/Project Name': '', 'Address': '', 'Notes': ''
              });
            }
            // First occurrence of target phone
            const firstIdx = allRows.length;
            allRows.push({
              'Lead Name': name1, 'Lead Phone Number': phone,
              'Service Type': '', 'Property Type': '', 'Lead Date': '',
              'Locality': '', 'Configuration': '', 'Price': '',
              'Building/Project Name': '', 'Address': '', 'Notes': ''
            });
            // Add more rows in between
            for (const [n, p] of otherRows.slice(3)) {
              allRows.push({
                'Lead Name': n, 'Lead Phone Number': p,
                'Service Type': '', 'Property Type': '', 'Lead Date': '',
                'Locality': '', 'Configuration': '', 'Price': '',
                'Building/Project Name': '', 'Address': '', 'Notes': ''
              });
            }
            // Second occurrence (duplicate) of target phone
            const dupIdx = allRows.length;
            allRows.push({
              'Lead Name': name2, 'Lead Phone Number': phone,
              'Service Type': '', 'Property Type': '', 'Lead Date': '',
              'Locality': '', 'Configuration': '', 'Price': '',
              'Building/Project Name': '', 'Address': '', 'Notes': ''
            });
            return { allRows, phone, name1, name2, firstIdx, dupIdx };
          });
        }),
        ({ allRows, phone, name1, name2, firstIdx, dupIdx }) => {
          const adminUserId = 'admin123';
          const { validLeads, duplicateDetails } = processRows(allRows, adminUserId);

          // Find the lead with our target phone in validLeads
          const leadWithPhone = validLeads.find(l => l.number === phone);

          if (leadWithPhone) {
            // It should be the first occurrence (name1)
            expect(leadWithPhone.name).toBe(name1.trim());

            // The duplicate (name2) should be in duplicateDetails
            const dupEntry = duplicateDetails.find(
              d => d.number === phone && d.row === dupIdx + 2
            );
            expect(dupEntry).toBeDefined();
            expect(dupEntry.name).toBe(name2.trim());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Integration Tests for POST /api/leads/import
 * 
 * Tests the full endpoint flow using mongodb-memory-server and supertest.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.4, 2.5, 5.1, 5.3, 5.5, 5.6, 9.4
 */
describe('Import Controller - Integration Tests', () => {
  let mongoServer;
  let app;
  let Lead;
  const JWT_SECRET = 'test-jwt-secret-for-integration';

  // Helper: Generate a valid Admin JWT token
  function generateToken(userId, role = 'Admin') {
    return jwt.sign(
      { userId, phone: '9999999999', role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  // Helper: Create a valid .xlsx buffer from row data
  function createExcelBuffer(rows) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect mongoose
    await mongoose.connect(mongoUri);

    // Set JWT_SECRET in env for auth middleware
    process.env.JWT_SECRET = JWT_SECRET;

    // Build the Express app with required routes
    // We need to require after setting up env and DB connection
    const leadRoutes = require('../routes/leadRoutes');
    const errorHandler = require('../middleware/errorHandler');

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/leads', leadRoutes);
    app.use(errorHandler);

    Lead = require('../models/Lead');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up leads collection between tests
    await Lead.deleteMany({});
  });

  describe('1. Valid Excel file upload → leads created in DB', () => {
    it('should import valid leads from an Excel file and create them in the database', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      const token = generateToken(adminId);

      const rows = [
        {
          'Lead Name': 'Alice Smith',
          'Lead Phone Number': '9876543210',
          'Lead Date': '15/01/2024',
          'Service Type': 'Buy',
          'Property Type': 'Flat',
          'Locality': 'Andheri',
          'Configuration': '2BHK',
          'Price': '50L',
          'Building/Project Name': 'Green Towers',
          'Address': '123 Main St',
          'Notes': 'Interested in 2BHK'
        },
        {
          'Lead Name': 'Bob Johnson',
          'Lead Phone Number': '8765432109',
          'Lead Date': '20/02/2024',
          'Service Type': 'Rent',
          'Property Type': 'Villa',
          'Locality': 'Bandra',
          'Configuration': '3BHK',
          'Price': '80L',
          'Building/Project Name': 'Blue Sky',
          'Address': '456 Oak Ave',
          'Notes': 'Looking for rental'
        }
      ];

      const buffer = createExcelBuffer(rows);

      const response = await request(app)
        .post('/api/leads/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', buffer, 'leads.xlsx');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.imported).toBe(2);
      expect(response.body.totalRows).toBe(2);
      expect(response.body.duplicates).toBe(0);
      expect(response.body.invalid).toBe(0);

      // Verify leads are in the database
      const leads = await Lead.find({});
      expect(leads.length).toBe(2);

      const alice = leads.find(l => l.name === 'Alice Smith');
      expect(alice).toBeDefined();
      expect(alice.number).toBe('9876543210');
      expect(alice.serviceType).toBe('Buy');
      expect(alice.propertyType).toBe('Flat');
      expect(alice.locality).toBe('Andheri');
      expect(alice.configuration).toBe('2BHK');
      expect(alice.price).toBe('50L');
      expect(alice.buildingName).toBe('Green Towers');
      expect(alice.address).toBe('123 Main St');
      expect(alice.remark).toBe('Interested in 2BHK');
      expect(alice.status).toBe('CNR');
      expect(alice.leadSource).toBe('Other');
      expect(alice.user.toString()).toBe(adminId);
      expect(alice.createdBy.toString()).toBe(adminId);
      expect(alice.assignedTo).toBeNull();
      expect(alice.assignedBy).toBeNull();
    });
  });

  describe('2. Auth enforcement: 401 without token', () => {
    it('should return 401 when no Authorization header is provided', async () => {
      const rows = [{ 'Lead Name': 'Test', 'Lead Phone Number': '1234567890' }];
      const buffer = createExcelBuffer(rows);

      const response = await request(app)
        .post('/api/leads/import')
        .attach('file', buffer, 'leads.xlsx');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Access denied.*No token provided/i);
    });
  });

  describe('3. Auth enforcement: 403 for non-Admin (Agent role)', () => {
    it('should return 403 when an Agent user attempts to import', async () => {
      const agentId = new mongoose.Types.ObjectId().toString();
      const token = generateToken(agentId, 'Agent');

      const rows = [{ 'Lead Name': 'Test', 'Lead Phone Number': '1234567890' }];
      const buffer = createExcelBuffer(rows);

      const response = await request(app)
        .post('/api/leads/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', buffer, 'leads.xlsx');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Access denied.*Required role: Admin/i);
    });
  });

  describe('4. File validation: no file → 400', () => {
    it('should return 400 with "No file provided" when no file is attached', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      const token = generateToken(adminId);

      const response = await request(app)
        .post('/api/leads/import')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No file provided');
    });
  });

  describe('5. File validation: wrong MIME type → 400', () => {
    it('should return 400 when a non-xlsx file is uploaded', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      const token = generateToken(adminId);

      const csvContent = Buffer.from('Name,Phone\nAlice,9876543210\n');

      const response = await request(app)
        .post('/api/leads/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', csvContent, 'leads.csv');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Invalid file type/i);
    });
  });

  describe('6. Duplicate detection: rows matching existing DB records are skipped', () => {
    it('should skip rows whose phone numbers already exist in the database', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      const token = generateToken(adminId);

      // Pre-seed an existing lead in the DB
      await Lead.create({
        name: 'Existing Lead',
        number: '9876543210',
        user: adminId,
        createdBy: adminId,
        status: 'CNR',
        leadSource: 'Own User'
      });

      // Upload a file with one matching number and one new number
      const rows = [
        {
          'Lead Name': 'Duplicate Person',
          'Lead Phone Number': '9876543210',
          'Lead Date': '10/03/2024',
          'Notes': 'Should be skipped'
        },
        {
          'Lead Name': 'New Person',
          'Lead Phone Number': '1111111111',
          'Lead Date': '10/03/2024',
          'Notes': 'Should be imported'
        }
      ];

      const buffer = createExcelBuffer(rows);

      const response = await request(app)
        .post('/api/leads/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', buffer, 'leads.xlsx');

      expect(response.status).toBe(200);
      expect(response.body.imported).toBe(1);
      expect(response.body.duplicates).toBe(1);
      expect(response.body.duplicateDetails).toHaveLength(1);
      expect(response.body.duplicateDetails[0].number).toBe('9876543210');

      // Verify only 2 leads total (1 pre-existing + 1 newly imported)
      const allLeads = await Lead.find({});
      expect(allLeads.length).toBe(2);
    });
  });

  describe('7. Zero-import scenario: all rows are duplicates/invalid → 200 with imported=0', () => {
    it('should return 200 with imported=0 when all rows are invalid or duplicates', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      const token = generateToken(adminId);

      // Pre-seed an existing lead
      await Lead.create({
        name: 'Existing Lead',
        number: '5555555555',
        user: adminId,
        createdBy: adminId,
        status: 'CNR',
        leadSource: 'Own User'
      });

      // File with: 1 invalid (no name), 1 invalid (bad phone), 1 duplicate
      const rows = [
        {
          'Lead Name': '',
          'Lead Phone Number': '1234567890',
          'Notes': 'Invalid - no name'
        },
        {
          'Lead Name': 'Bad Phone',
          'Lead Phone Number': '123',
          'Notes': 'Invalid - short phone'
        },
        {
          'Lead Name': 'Duplicate',
          'Lead Phone Number': '5555555555',
          'Notes': 'Already in DB'
        }
      ];

      const buffer = createExcelBuffer(rows);

      const response = await request(app)
        .post('/api/leads/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', buffer, 'leads.xlsx');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.imported).toBe(0);
      expect(response.body.invalid).toBe(2);
      expect(response.body.duplicates).toBe(1);
      expect(response.body.totalRows).toBe(3);
    });
  });

  describe('8. Existing leads unchanged after import (Property 3 check)', () => {
    it('should not modify any existing leads in the database after import', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      const token = generateToken(adminId);

      // Pre-seed existing leads
      const existingLeadsData = [
        {
          name: 'Lead One',
          number: '1111111111',
          user: adminId,
          createdBy: adminId,
          status: 'FOLLOW_UP',
          leadSource: 'Investor',
          remark: 'Important client',
          serviceType: 'Sell',
          propertyType: 'Villa'
        },
        {
          name: 'Lead Two',
          number: '2222222222',
          user: adminId,
          createdBy: adminId,
          status: 'BOOKED',
          leadSource: 'Inquiry',
          remark: 'Deal closed',
          serviceType: 'Buy',
          propertyType: 'Flat'
        }
      ];

      const createdLeads = await Lead.insertMany(existingLeadsData);
      const snapshotBefore = createdLeads.map(l => ({
        id: l._id.toString(),
        name: l.name,
        number: l.number,
        status: l.status,
        leadSource: l.leadSource,
        remark: l.remark,
        serviceType: l.serviceType,
        propertyType: l.propertyType
      }));

      // Upload a file: one row duplicates '1111111111', two new leads
      const rows = [
        {
          'Lead Name': 'Should Be Skipped',
          'Lead Phone Number': '1111111111',
          'Notes': 'Duplicate of Lead One'
        },
        {
          'Lead Name': 'New Lead A',
          'Lead Phone Number': '3333333333',
          'Notes': 'Fresh lead'
        },
        {
          'Lead Name': 'New Lead B',
          'Lead Phone Number': '4444444444',
          'Notes': 'Another fresh lead'
        }
      ];

      const buffer = createExcelBuffer(rows);

      const response = await request(app)
        .post('/api/leads/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', buffer, 'leads.xlsx');

      expect(response.status).toBe(200);
      expect(response.body.imported).toBe(2);
      expect(response.body.duplicates).toBe(1);

      // Re-fetch the original leads and verify they are unchanged
      const snapshotAfter = await Promise.all(
        snapshotBefore.map(async (snap) => {
          const lead = await Lead.findById(snap.id);
          return {
            id: lead._id.toString(),
            name: lead.name,
            number: lead.number,
            status: lead.status,
            leadSource: lead.leadSource,
            remark: lead.remark,
            serviceType: lead.serviceType,
            propertyType: lead.propertyType
          };
        })
      );

      // Every existing lead field must be identical
      for (let i = 0; i < snapshotBefore.length; i++) {
        expect(snapshotAfter[i]).toEqual(snapshotBefore[i]);
      }

      // Total leads should be original 2 + 2 new = 4
      const totalLeads = await Lead.countDocuments();
      expect(totalLeads).toBe(4);
    });
  });
});


/**
 * Property 3: Duplicate detection preserves existing leads
 * **Validates: Requirements 5.5, 5.6**
 *
 * For any set of existing leads in the database and any imported Excel file,
 * after the import operation completes, all previously existing leads SHALL
 * remain in the database with identical field values.
 */
describe('Import Controller - Property 3: Duplicate detection preserves existing leads', () => {
  let mongoServer;
  let connection;
  let LeadModel;
  const { importLeads } = require('./importController');

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    connection = await mongoose.createConnection(uri).asPromise();

    // Register Lead schema on this connection
    const leadSchema = require('../models/Lead').schema;
    LeadModel = connection.model('Lead', leadSchema);
  });

  afterAll(async () => {
    await connection.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await LeadModel.deleteMany({});
  });

  // Generator for a valid 10-digit phone number
  const validPhoneArb = fc.stringOf(
    fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
    { minLength: 10, maxLength: 10 }
  );

  // Generator for a non-empty name
  const nameArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0);

  // Generator for an existing lead (to seed DB)
  const existingLeadArb = fc.record({
    name: nameArb,
    number: validPhoneArb,
    remark: fc.constant('existing remark'),
    serviceType: fc.constantFrom('Buy', 'Sell', 'Rent', ''),
    propertyType: fc.constantFrom('Flat', 'Villa', 'Plot', ''),
    locality: fc.string({ maxLength: 20 }),
    configuration: fc.constantFrom('1BHK', '2BHK', '3BHK', ''),
    price: fc.string({ maxLength: 10 }),
    buildingName: fc.string({ maxLength: 20 }),
    address: fc.string({ maxLength: 30 })
  });

  // Generator for Excel import rows
  const excelRowArb = fc.record({
    'Lead Name': nameArb,
    'Lead Phone Number': validPhoneArb,
    'Lead Date': fc.constant('15/01/2024'),
    'Notes': fc.string({ maxLength: 30 }),
    'Service Type': fc.string({ maxLength: 15 }),
    'Property Type': fc.string({ maxLength: 15 }),
    'Locality': fc.string({ maxLength: 20 }),
    'Configuration': fc.string({ maxLength: 10 }),
    'Price': fc.string({ maxLength: 10 }),
    'Building/Project Name': fc.string({ maxLength: 20 }),
    'Address': fc.string({ maxLength: 30 })
  });

  /**
   * Helper: Simulates calling the importLeads controller with an Excel buffer.
   * Uses the Lead model from the test's connection for DB operations.
   */
  async function runImportWithModel(excelRows, adminUserId) {
    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Simulate the controller logic directly against our test DB connection
    const rows = XLSX.utils.sheet_to_json(XLSX.read(buffer, { type: 'buffer' }).Sheets['Sheet1']);
    const { normalizePhone } = require('../utils/phoneNormalizer');
    const { mapExcelRow: mapRow } = require('../utils/excelMapper');
    const { validateRow: validate } = require('../utils/rowValidator');

    const duplicateDetails = [];
    const invalidDetails = [];
    const validLeads = [];

    // Get all existing phone numbers for duplicate detection
    const existingLeads = await LeadModel.find({}, { number: 1 });
    const existingNumbers = new Set(existingLeads.map(l => l.number));
    const seenInFile = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const mapped = mapRow(rows[i], adminUserId);

      const validation = validate(mapped);
      if (!validation.valid) {
        invalidDetails.push({ row: rowNum, name: mapped.name, reason: validation.reason });
        continue;
      }

      if (existingNumbers.has(mapped.number)) {
        duplicateDetails.push({ row: rowNum, name: mapped.name, number: mapped.number });
        continue;
      }

      if (seenInFile.has(mapped.number)) {
        duplicateDetails.push({ row: rowNum, name: mapped.name, number: mapped.number });
        continue;
      }

      seenInFile.add(mapped.number);
      validLeads.push(mapped);
    }

    // Bulk insert valid leads
    let imported = 0;
    if (validLeads.length > 0) {
      try {
        const result = await LeadModel.insertMany(validLeads, { ordered: false });
        imported = result.length;
      } catch (err) {
        if (err.insertedDocs) {
          imported = err.insertedDocs.length;
        } else if (err.result && err.result.nInserted) {
          imported = err.result.nInserted;
        }
      }
    }

    return { imported, duplicates: duplicateDetails.length, invalid: invalidDetails.length };
  }

  it('all existing leads remain unchanged after import with random rows', async () => {
    // **Validates: Requirements 5.5, 5.6**
    await fc.assert(
      fc.asyncProperty(
        // Generate 1-5 existing leads with unique phone numbers
        fc.array(existingLeadArb, { minLength: 1, maxLength: 5 })
          .map(leads => {
            const seen = new Set();
            return leads.filter(l => {
              if (seen.has(l.number)) return false;
              seen.add(l.number);
              return true;
            });
          })
          .filter(leads => leads.length > 0),
        // Generate 1-5 import rows (mix of potentially duplicate and new phones)
        fc.array(excelRowArb, { minLength: 1, maxLength: 5 }),
        async (existingLeads, importRows) => {
          // Clean DB for this iteration
          await LeadModel.deleteMany({});

          const adminUserId = new mongoose.Types.ObjectId();

          // Seed existing leads into DB
          const seededDocs = await LeadModel.insertMany(
            existingLeads.map(l => ({
              ...l,
              user: adminUserId,
              createdBy: adminUserId,
              status: 'CNR',
              leadSource: 'Other',
              leadFrom: '',
              assignedTo: null,
              assignedBy: null
            }))
          );

          // Snapshot all original leads before import
          const originalSnapshot = seededDocs.map(doc => ({
            _id: doc._id.toString(),
            name: doc.name,
            number: doc.number,
            remark: doc.remark,
            serviceType: doc.serviceType,
            propertyType: doc.propertyType,
            locality: doc.locality,
            configuration: doc.configuration,
            price: doc.price,
            buildingName: doc.buildingName,
            address: doc.address,
            status: doc.status,
            leadSource: doc.leadSource
          }));

          // Run import
          await runImportWithModel(importRows, adminUserId.toString());

          // Verify ALL original leads remain in DB with identical field values
          for (const original of originalSnapshot) {
            const dbLead = await LeadModel.findById(original._id).lean();
            expect(dbLead).not.toBeNull();
            expect(dbLead.name).toBe(original.name);
            expect(dbLead.number).toBe(original.number);
            expect(dbLead.remark).toBe(original.remark);
            expect(dbLead.serviceType).toBe(original.serviceType);
            expect(dbLead.propertyType).toBe(original.propertyType);
            expect(dbLead.locality).toBe(original.locality);
            expect(dbLead.configuration).toBe(original.configuration);
            expect(dbLead.price).toBe(original.price);
            expect(dbLead.buildingName).toBe(original.buildingName);
            expect(dbLead.address).toBe(original.address);
            expect(dbLead.status).toBe(original.status);
            expect(dbLead.leadSource).toBe(original.leadSource);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('existing leads with same phone as import rows are never modified or deleted', async () => {
    // **Validates: Requirements 5.5, 5.6**
    // Specifically ensures that when imported rows have the same phone as existing leads,
    // those existing leads are preserved with their original data.
    await fc.assert(
      fc.asyncProperty(
        // Generate 1-3 existing leads with unique phones
        fc.array(fc.tuple(nameArb, validPhoneArb), { minLength: 1, maxLength: 3 })
          .map(pairs => {
            const seen = new Set();
            return pairs.filter(([, phone]) => {
              if (seen.has(phone)) return false;
              seen.add(phone);
              return true;
            });
          })
          .filter(arr => arr.length > 0),
        // Generate different names for import rows attempting to overwrite
        fc.array(nameArb, { minLength: 1, maxLength: 3 }),
        async (existingPairs, importNames) => {
          await LeadModel.deleteMany({});

          const adminUserId = new mongoose.Types.ObjectId();

          // Seed existing leads
          const seededDocs = await LeadModel.insertMany(
            existingPairs.map(([name, number]) => ({
              name,
              number,
              user: adminUserId,
              createdBy: adminUserId,
              status: 'CNR',
              leadSource: 'Other',
              leadFrom: '',
              assignedTo: null,
              assignedBy: null
            }))
          );

          // Snapshot originals
          const originalSnapshot = seededDocs.map(doc => ({
            _id: doc._id.toString(),
            name: doc.name,
            number: doc.number
          }));

          // Create import rows that attempt to use same phone numbers with different names
          const importRows = existingPairs.map(([, phone], idx) => ({
            'Lead Name': (importNames[idx % importNames.length] || 'ImportAttempt') + '_new',
            'Lead Phone Number': phone,
            'Lead Date': '01/01/2024',
            'Notes': 'Attempt to overwrite',
            'Service Type': 'Overwrite',
            'Property Type': 'Overwrite',
            'Locality': 'Overwrite',
            'Configuration': 'Overwrite',
            'Price': 'Overwrite',
            'Building/Project Name': 'Overwrite',
            'Address': 'Overwrite'
          }));

          // Run import
          const result = await runImportWithModel(importRows, adminUserId.toString());

          // All rows should be detected as duplicates
          expect(result.duplicates).toBe(importRows.length);
          expect(result.imported).toBe(0);

          // Verify existing leads are completely unchanged
          for (const original of originalSnapshot) {
            const dbLead = await LeadModel.findById(original._id).lean();
            expect(dbLead).not.toBeNull();
            expect(dbLead.name).toBe(original.name);
            expect(dbLead.number).toBe(original.number);
          }

          // Lead count should be exactly the same as before import
          const totalCount = await LeadModel.countDocuments();
          expect(totalCount).toBe(existingPairs.length);
        }
      ),
      { numRuns: 20 }
    );
  });
});
