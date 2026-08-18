const XLSX = require('xlsx');
const multer = require('multer');
const Lead = require('../models/Lead');
const { mapExcelRow } = require('../utils/excelMapper');
const { validateRow } = require('../utils/rowValidator');

/**
 * POST /api/leads/import
 * Handles bulk Excel lead import.
 * 
 * Parses uploaded .xlsx file buffer, maps rows to Lead fields,
 * validates each row, detects duplicates (against DB and intra-file),
 * and bulk-inserts valid leads.
 * 
 * Requirements: 2.4, 2.5, 2.6, 3.1, 3.2, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6,
 *              8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4
 */
const importLeads = async (req, res, next) => {
  try {
    // Check if file was provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
        statusCode: 400
      });
    }

    // Parse Excel from buffer - wrap in try/catch for corrupted files
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Excel file',
        statusCode: 400
      });
    }

    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const adminUserId = req.user.userId;
    const duplicateDetails = [];
    const invalidDetails = [];
    const validLeads = [];

    // Get all existing phone numbers for duplicate detection
    const existingLeads = await Lead.find({}, { number: 1 });
    const existingNumbers = new Set(existingLeads.map(l => l.number));
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

    // Bulk insert with ordered: false for partial failure resilience
    let imported = 0;
    if (validLeads.length > 0) {
      try {
        const result = await Lead.insertMany(validLeads, { ordered: false });
        imported = result.length;
      } catch (err) {
        // BulkWriteError: some succeeded, some failed
        if (err.insertedDocs) {
          imported = err.insertedDocs.length;
        } else if (err.result && err.result.nInserted) {
          imported = err.result.nInserted;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Import completed',
      totalRows: rows.length,
      imported,
      duplicates: duplicateDetails.length,
      invalid: invalidDetails.length,
      duplicateDetails,
      invalidDetails
    });
  } catch (error) {
    // Handle multer errors (e.g., file size limit)
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds 5 MB limit',
          statusCode: 400
        });
      }
    }
    next(error);
  }
};

module.exports = { importLeads };
