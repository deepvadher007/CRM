# Implementation Plan: CRM Lead Assignment

## Overview

Remove all PDF upload infrastructure and add lead assignment functionality. Changes touch the Lead model, controller, routes, server, and the Admin Dashboard. Tasks are ordered to avoid broken intermediate states — deletions first, then additions, then UI, then tests.

## Tasks

- [x] 1. Remove multer dependency and config
  - Delete `"multer": "^1.4.5-lts.1"` from `backend/package.json` dependencies (edit file directly, do not run npm uninstall)
  - Delete `backend/src/config/multer.js` entirely
  - _Requirements: 1.1, 1.2_

- [x] 2. Update Lead schema
  - [x] 2.1 Remove `pdfFile` field and add `assignedTo` field in `backend/src/models/Lead.js`
    - Remove the `pdfFile` field definition
    - Add `assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }`
    - _Requirements: 2.1, 4.1, 4.2_

  - [ ]* 2.2 Write property test for Lead schema defaults (P1)
    - **Property 1: Lead creation without assignedTo defaults to null**
    - **Validates: Requirements 4.2**
    - Use `fc.record({ name: fc.string(), number: fc.string(), status: fc.constantFrom('CNR','Interested','Not Interested') })`, 100 runs
    - In `backend/src/controllers/leadController.test.js`

  - [ ]* 2.3 Write property test for pdfFile absence (P2)
    - **Property 2: Lead creation round-trip excludes pdfFile**
    - **Validates: Requirements 2.2**
    - Use `fc.record({ name: fc.string(), number: fc.string(), status: fc.constantFrom('CNR') })`, 100 runs
    - In `backend/src/controllers/leadController.test.js`

  - [ ]* 2.4 Write unit tests for Lead schema changes
    - Test: `assignedTo` defaults to `null` on new lead
    - Test: `pdfFile` field is absent from created lead document
    - In `backend/src/controllers/leadController.test.js`

- [x] 3. Update Lead controller
  - [x] 3.1 Remove `uploadPDF` and add `assignLead` in `backend/src/controllers/leadController.js`
    - Remove the `uploadPDF` function entirely
    - Add `assignLead`: `PUT /api/leads/assign/:leadId`, Admin only (enforced at route level)
      - Return 400 if `agentId` key is absent from request body
      - Return 404 if lead not found (add `mongoose.isValidObjectId` guard for malformed IDs → 400)
      - Set `lead.assignedTo = agentId` (supports `null` for unassign), save, return updated lead
    - Export `assignLead`
    - _Requirements: 1.3, 5.2, 5.3, 5.4, 5.6_

  - [x] 3.2 Update `getAllLeads` to populate `assignedTo` for Admin queries
    - Add `.populate('assignedTo', 'name')` alongside the existing `.populate('createdBy', 'name role')` in the Admin branch
    - _Requirements: 7.4_

  - [ ]* 3.3 Write property test for assignLead sets assignedTo (P4)
    - **Property 4: Assign endpoint sets assignedTo to the provided agentId**
    - **Validates: Requirements 5.2, 5.6**
    - Use `fc.option(fc.string({ minLength: 24, maxLength: 24 }))` for agentId, 100 runs
    - In `backend/src/controllers/leadController.test.js`

  - [ ]* 3.4 Write property test for Admin sees all leads (P5)
    - **Property 5: Admin always sees all leads regardless of assignedTo**
    - **Validates: Requirements 6.1**
    - Use `fc.array(fc.record({ assignedTo: fc.option(fc.string()) }))`, 100 runs
    - In `backend/src/controllers/leadController.test.js`

  - [ ]* 3.5 Write property test for Agent visibility unchanged (P6)
    - **Property 6: Agent visibility is unaffected by assignment**
    - **Validates: Requirements 6.2**
    - Use `fc.array(fc.record({ user: fc.string() }))`, 100 runs
    - In `backend/src/controllers/leadController.test.js`

  - [ ]* 3.6 Write property test for Admin GET populates assignedTo.name (P8)
    - **Property 8: Admin GET /api/leads populates assignedTo.name**
    - **Validates: Requirements 7.4**
    - Seed leads with known `assignedTo` ObjectIds, 100 runs
    - In `backend/src/controllers/leadController.test.js`

  - [ ]* 3.7 Write unit tests for assignLead
    - Test: missing `agentId` key returns 400
    - Test: non-existent `leadId` returns 404
    - Test: valid call returns 200 with updated lead
    - Test: `agentId: null` sets `assignedTo` to null (unassign)
    - Test: Admin `getAllLeads` response includes populated `assignedTo` object with `name`
    - In `backend/src/controllers/leadController.test.js`

- [x] 4. Update Lead routes
  - [x] 4.1 Update `backend/src/routes/leadRoutes.js`
    - Remove `const upload = require('../config/multer')` import
    - Remove `uploadPDF` from controller destructuring
    - Remove `router.post('/:id/upload-pdf', upload.single('pdf'), uploadPDF)` route
    - Add `const { requireRole } = require('../middleware/roleAuth')` import (check export name in roleAuth.js first)
    - Add `assignLead` to controller destructuring
    - Add `router.put('/assign/:leadId', requireRole('Admin'), assignLead)` — MUST be declared before any `router.put('/:id', ...)` line
    - _Requirements: 1.4, 1.5, 5.1_

- [x] 5. Update server.js
  - In `backend/src/server.js`, remove `app.use('/uploads', express.static(...))` line
  - Check if `path` is used anywhere else in server.js; remove `const path = require('path')` only if unused
  - _Requirements: 1.6_

- [x] 6. Checkpoint — backend wired up
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 7. Update Admin Dashboard — remove PDF UI
  - [x] 7.1 Remove PDF state, handlers, and UI from `frontend/src/components/dashboard/Dashboard.jsx`
    - Remove state variables: `uploadingPdf`, `whatsappPhone`, `showWhatsappModal`, `selectedLead`
    - Remove handler functions: `handlePDFUpload`, `handleViewPDF`, `handleWhatsAppShare`, `handleWhatsAppShareManual`
    - Remove the `pdf-actions` div from each table row (file input, view PDF button, WhatsApp share button)
    - Remove the WhatsApp phone number modal at the bottom of the component
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 8. Update Admin Dashboard — add assignment UI
  - [x] 8.1 Add `assigningLeadId` state and "Assigned To" column in `frontend/src/components/dashboard/Dashboard.jsx`
    - Add `const [assigningLeadId, setAssigningLeadId] = useState(null)`
    - Add `<th>Assigned To</th>` to the table header after the "Added By" column (Admin only)
    - Add `<td>{lead.assignedTo?.name || 'Unassigned'}</td>` to each table row (Admin only)
    - Update the no-data row `colSpan`: Admin gets +1 for the new column
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 8.2 Add "Assign" button and inline agent dropdown per row (Admin only)
    - Add "Assign" button in the actions cell of each row (Admin only) that calls `setAssigningLeadId(lead._id)`
    - When `assigningLeadId === lead._id`, render an inline `<select>` populated with agents from `GET /api/auth/agents`
    - On agent select: call `PUT /api/leads/assign/:leadId` with `{ agentId: selectedValue }`, then `fetchLeads()`, then `setAssigningLeadId(null)`
    - On error: call `setError(extractErrorMessage(err, 'Failed to assign lead'))`
    - Extend existing `handleClickOutside` to also reset `assigningLeadId` to `null`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 8.3 Write property test for display value correctness (P7)
    - **Property 7: Admin lead response correctly reflects assignedTo display value**
    - **Validates: Requirements 7.2, 7.3**
    - Use `fc.option(fc.record({ name: fc.string() }))` for `assignedTo`, 100 runs
    - In `frontend/src/components/dashboard/Dashboard.test.jsx`

  - [ ]* 8.4 Write property test for agent selection triggers correct API call (P9)
    - **Property 9: Agent selection triggers correct assignment API call**
    - **Validates: Requirements 8.3**
    - Use `fc.array(fc.record({ _id: fc.string(), name: fc.string() }), { minLength: 1 })` for agents, 100 runs
    - In `frontend/src/components/dashboard/Dashboard.test.jsx`

  - [ ]* 8.5 Write unit tests for Dashboard assignment UI
    - Test: Admin sees "Assigned To" table header
    - Test: Agent does not see "Assigned To" table header
    - Test: Admin sees "Assign" button per row
    - Test: Agent does not see "Assign" button
    - Test: clicking "Assign" shows agent dropdown
    - Test: successful assignment calls `fetchLeads` and closes dropdown
    - Test: assignment API failure displays error message
    - In `frontend/src/components/dashboard/Dashboard.test.jsx`

- [x] 9. Backend route property test for non-Admin 403 (P3)
  - [x] 9.1 Write property test for non-Admin gets 403 on assign endpoint
    - **Property 3: Non-Admin users cannot call the assign endpoint**
    - **Validates: Requirements 5.1, 5.5**
    - Use `fc.constantFrom('Agent')` + random leadId, 100 runs
    - In `backend/src/routes/leadRoutes.test.js`

- [x] 10. Final checkpoint — all tests pass
  - Ensure all backend and frontend tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Route `/assign/:leadId` must be registered before `/:id` in leadRoutes.js to prevent Express matching `assign` as an `:id` param
- Check `requireRole` export name in `backend/src/middleware/roleAuth.js` before importing
- Check `path` usage in `server.js` before removing the import
- Property tests use fast-check with `numRuns: 100`; each test must include a comment tag: `// Feature: crm-lead-assignment, Property <N>: <property_text>`
