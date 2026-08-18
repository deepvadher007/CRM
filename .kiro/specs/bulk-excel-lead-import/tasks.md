# Implementation Plan: Bulk Excel Lead Import

## Overview

This plan implements bulk Excel lead import for the Hanuvansh CRM. The implementation adds backend utilities (phone normalizer, Excel mapper, row validator), a multer-based upload configuration, an import controller, a new route, Lead schema extensions, and a React modal component for the Admin dashboard. Tasks are ordered so each step builds on previous ones, with property-based tests validating correctness properties from the design.

## Tasks

- [x] 1. Install dependencies and extend Lead schema
  - [x] 1.1 Install backend dependencies (multer, xlsx)
    - Run `npm install multer xlsx` in the backend directory
    - _Requirements: 2.7, 3.1_

  - [x] 1.2 Extend Lead schema with optional real-estate fields
    - Add `serviceType`, `propertyType`, `locality`, `configuration`, `price`, `buildingName`, `address` fields to `backend/src/models/Lead.js`
    - All fields: type String, trim: true, default: ''
    - Ensure existing lead creation still works without these fields
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 12.5_

- [x] 2. Implement phone normalizer utility
  - [x] 2.1 Create phone normalizer module
    - Create `backend/src/utils/phoneNormalizer.js`
    - Implement `normalizePhone(raw)` function that strips non-digit characters, removes "91" country code prefix from 12-digit numbers, removes "0" trunk prefix from 11-digit numbers
    - Export as CommonJS module
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.2 Write property test: Phone normalization produces valid output (Property 1)
    - **Property 1: Phone normalization produces valid output**
    - **Validates: Requirements 4.1, 4.2, 4.4**
    - Create `backend/src/utils/phoneNormalizer.test.js`
    - Use fast-check to generate arbitrary string inputs and verify output contains only digits

  - [x] 2.3 Write property test: Phone normalization is idempotent (Property 2)
    - **Property 2: Phone normalization is idempotent**
    - **Validates: Requirements 4.5**
    - Use fast-check to verify `normalizePhone(normalizePhone(x)) === normalizePhone(x)` for all inputs

  - [x] 2.4 Write unit tests for phone normalizer examples
    - Test `"(+91)-7600331516"` → `"7600331516"`
    - Test already-10-digit numbers returned unchanged
    - Test null/undefined inputs return empty string
    - _Requirements: 4.3, 4.4_

- [x] 3. Implement Excel row mapper utility
  - [x] 3.1 Create Excel mapper module
    - Create `backend/src/utils/excelMapper.js`
    - Implement `mapExcelRow(row, adminUserId)` that maps Excel column headers to Lead fields
    - Implement `parseDate(raw)` that parses DD/MM/YYYY format with fallback to current date
    - Import and use `normalizePhone` for the phone field
    - Export as CommonJS module
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 3.2 Write property test: Column mapping correctness (Property 8)
    - **Property 8: Column mapping correctness**
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13**
    - Create `backend/src/utils/excelMapper.test.js`
    - Use fast-check to generate arbitrary row objects and verify each source column maps to the correct destination field

  - [x] 3.3 Write property test: Import defaults invariant (Property 6)
    - **Property 6: Import defaults invariant**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
    - Use fast-check to verify every mapped row has status 'CNR', leadSource 'Other', assignedTo null, assignedBy null, user === adminId, createdBy === adminId

  - [x] 3.4 Write unit tests for date parsing
    - Test `"15/01/2024"` → valid Date object (Jan 15, 2024)
    - Test `"invalid"` → current date fallback
    - Test empty/null → current date
    - _Requirements: 3.5, 6.5_

- [x] 4. Implement row validator utility
  - [x] 4.1 Create row validator module
    - Create `backend/src/utils/rowValidator.js`
    - Implement `validateRow(mappedRow)` that checks name is non-empty and number is exactly 10 digits
    - Returns `{ valid: true }` or `{ valid: false, reason: string }`
    - Export as CommonJS module
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 4.2 Write property test: Row validation rejects invalid names and numbers (Property 5)
    - **Property 5: Row validation rejects invalid names and numbers**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
    - Use fast-check to generate rows with empty names or non-10-digit numbers and verify they are rejected

- [x] 5. Checkpoint - Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement multer upload configuration
  - [x] 6.1 Create upload config module
    - Create `backend/src/config/uploadConfig.js`
    - Configure multer with memoryStorage (no disk writes)
    - Add fileFilter to accept only `.xlsx` extension and correct MIME type
    - Set 5 MB file size limit
    - Export `upload` middleware
    - _Requirements: 2.1, 2.2, 2.3, 2.7_

- [x] 7. Implement import controller
  - [x] 7.1 Create import controller
    - Create `backend/src/controllers/importController.js`
    - Implement `importLeads` async handler
    - Parse Excel buffer with xlsx, iterate rows using mapExcelRow
    - Validate each row with validateRow
    - Detect duplicates against DB (load existing phone numbers) and intra-file (Set tracking)
    - Bulk insert with `Lead.insertMany({ ordered: false })`
    - Return structured response with totalRows, imported, duplicates, invalid counts and details
    - Handle multer errors (MulterError for file size)
    - Handle xlsx parse errors (corrupted file → 400)
    - _Requirements: 2.4, 2.5, 2.6, 3.1, 3.2, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4_

  - [x] 7.2 Write property test: Intra-file duplicate detection keeps first occurrence (Property 4)
    - **Property 4: Intra-file duplicate detection keeps first occurrence only**
    - **Validates: Requirements 5.2, 5.4**
    - Use fast-check to generate arrays of rows with some duplicate phone numbers, verify only first occurrence is accepted

  - [x] 7.3 Write property test: Response count consistency (Property 7)
    - **Property 7: Response count consistency**
    - **Validates: Requirements 9.1, 9.2, 9.3**
    - Use fast-check to verify totalRows === imported + duplicates + invalid and array lengths match counts

- [x] 8. Add import route to lead routes
  - [x] 8.1 Register import endpoint in leadRoutes.js
    - Add `const { upload } = require('../config/uploadConfig')` to `backend/src/routes/leadRoutes.js`
    - Add `const { importLeads } = require('../controllers/importController')`
    - Add route: `router.post('/import', requireRole('Admin'), upload.single('file'), importLeads)` before the catch-all `/:id` routes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 12.1, 12.2, 12.3, 12.4_

- [x] 9. Checkpoint - Ensure backend integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Write backend integration tests
  - [x] 10.1 Write integration tests for import endpoint
    - Create `backend/src/controllers/importController.test.js`
    - Test full upload flow: valid Excel file → leads created in DB
    - Test auth enforcement (401 without token, 403 for non-Admin)
    - Test file validation (no file, wrong extension, oversize)
    - Test duplicate detection against existing DB records
    - Test that existing leads remain unchanged after import (Property 3)
    - Test zero-import scenario (all duplicates/invalid)
    - Use mongodb-memory-server and supertest
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 2.5, 5.1, 5.3, 5.5, 5.6, 9.4_

  - [x] 10.2 Write property test: Duplicate detection preserves existing leads (Property 3)
    - **Property 3: Duplicate detection preserves existing leads**
    - **Validates: Requirements 5.5, 5.6**
    - Use fast-check with mongodb-memory-server to seed random leads, import a file, and verify all original leads remain unchanged

- [x] 11. Implement frontend ImportLeadsModal component
  - [x] 11.1 Create ImportLeadsModal component
    - Create `frontend/src/components/dashboard/ImportLeadsModal.jsx`
    - Create `frontend/src/components/dashboard/ImportLeadsModal.css`
    - Implement modal with file input (accept=".xlsx"), preview table (first 5 rows), import button, loading spinner, result summary, error display
    - Use `xlsx` package (install in frontend: `npm install xlsx`) for client-side preview parsing
    - Use `api.post('/api/leads/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })` for upload
    - Use existing `extractErrorMessage` utility for error handling
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x] 11.2 Integrate ImportLeadsModal into Dashboard
    - Add "Import Leads" button in Dashboard header (visible only for Admin role)
    - Add state management for modal open/close
    - Pass `onImportComplete` callback that refreshes lead list via `fetchLeads()`
    - Ensure no changes to existing form, table, filter, or follow-up sections
    - _Requirements: 11.1, 12.6_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend uses CommonJS modules (`require`/`module.exports`) throughout
- fast-check is already available in backend devDependencies
- xlsx needs to be installed in both backend (for server parsing) and frontend (for client-side preview)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "4.1"] },
    { "id": 4, "tasks": ["4.2", "6.1"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "8.1"] },
    { "id": 7, "tasks": ["10.1", "10.2", "11.1"] },
    { "id": 8, "tasks": ["11.2"] }
  ]
}
```
