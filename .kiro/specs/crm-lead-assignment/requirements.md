# Requirements Document

## Introduction

This document covers two coordinated changes to the Hanuvansh CRM (MERN stack):

1. **PDF System Removal** — The client no longer needs PDF upload, view, or WhatsApp-sharing functionality. All PDF-related code must be removed from the backend (multer, upload controller, upload route, `pdfFile` schema field, static uploads serving) and from the frontend (upload buttons, view buttons, WhatsApp PDF sharing, related state and handlers in Dashboard.jsx).

2. **Lead Assignment Feature** — Admins gain the ability to optionally assign any lead to a specific agent. This is additive and must not alter existing lead visibility rules: admins continue to see all leads, agents continue to see only their own leads.

---

## Glossary

- **CRM_System**: The Hanuvansh CRM MERN application (Express backend + React frontend).
- **Admin**: A user with `role === 'Admin'` who has full visibility over all leads.
- **Agent**: A user with `role === 'Agent'` who can only see leads they own (`lead.user === agent._id`).
- **Lead**: A MongoDB document in the `leads` collection representing a sales prospect.
- **Assignment**: The optional association of a Lead to an Agent via the `assignedTo` field.
- **Lead_Controller**: The Express controller module at `backend/src/controllers/leadController.js`.
- **Lead_Schema**: The Mongoose schema defined in `backend/src/models/Lead.js`.
- **Dashboard**: The React component at `frontend/src/components/dashboard/Dashboard.jsx`.
- **API_Service**: The Axios instance at `frontend/src/services/api.js`.

---

## Requirements

### Requirement 1: Remove PDF Upload Infrastructure (Backend)

**User Story:** As a developer, I want all PDF upload infrastructure removed from the backend, so that the codebase no longer carries unused multer dependencies, upload routes, or file storage logic.

#### Acceptance Criteria

1. THE CRM_System SHALL remove the `multer` package from `backend/package.json` dependencies.
2. THE CRM_System SHALL delete the file `backend/src/config/multer.js`.
3. THE CRM_System SHALL remove the `uploadPDF` function from the Lead_Controller.
4. THE CRM_System SHALL remove the `POST /api/leads/:id/upload-pdf` route from `backend/src/routes/leadRoutes.js`.
5. THE CRM_System SHALL remove the `require('../config/multer')` import and the `upload` middleware reference from `backend/src/routes/leadRoutes.js`.
6. THE CRM_System SHALL remove the static file serving line `app.use('/uploads', express.static(...))` from `backend/src/server.js`.
7. THE CRM_System SHALL remove the `uploads/` directory and its contents from the repository.

---

### Requirement 2: Remove PDF Field from Lead Schema

**User Story:** As a developer, I want the `pdfFile` field removed from the Lead schema, so that the database model no longer references PDF storage.

#### Acceptance Criteria

1. THE Lead_Schema SHALL NOT contain a `pdfFile` field after this change.
2. WHEN a new Lead document is created, THE Lead_Schema SHALL accept documents without any PDF-related fields.
3. THE CRM_System SHALL NOT include `pdfFile` in any Lead query, response, or validation logic.

---

### Requirement 3: Remove PDF UI from Frontend Dashboard

**User Story:** As a developer, I want all PDF-related UI elements and handlers removed from the Dashboard, so that users no longer see upload, view, or WhatsApp PDF sharing controls.

#### Acceptance Criteria

1. THE Dashboard SHALL NOT render a PDF upload button or file input for any lead row.
2. THE Dashboard SHALL NOT render a "View PDF" button for any lead row.
3. THE Dashboard SHALL NOT render a "Share via WhatsApp (PDF)" button for any lead row.
4. THE Dashboard SHALL NOT contain the `handlePDFUpload`, `handleViewPDF`, `handleWhatsAppShare`, or `handleWhatsAppShareManual` functions.
5. THE Dashboard SHALL NOT contain the `uploadingPdf`, `whatsappPhone`, `showWhatsappModal`, or `selectedLead` state variables.
6. THE Dashboard SHALL NOT render the WhatsApp phone number modal.
7. THE Dashboard SHALL NOT import or reference any PDF-related API calls.

---

### Requirement 4: Add `assignedTo` Field to Lead Schema

**User Story:** As a developer, I want an optional `assignedTo` field on the Lead schema, so that leads can be associated with a specific agent without breaking existing functionality.

#### Acceptance Criteria

1. THE Lead_Schema SHALL include an `assignedTo` field of type `mongoose.Schema.Types.ObjectId` with `ref: 'User'` and `default: null`.
2. WHEN a Lead is created without specifying `assignedTo`, THE Lead_Schema SHALL store `null` for the `assignedTo` field.
3. THE Lead_Schema SHALL allow `assignedTo` to be updated independently of all other lead fields.
4. THE CRM_System SHALL NOT require `assignedTo` to be set for lead creation or update operations.

---

### Requirement 5: Lead Assignment API Endpoint

**User Story:** As an Admin, I want a dedicated API endpoint to assign a lead to an agent, so that I can manage lead distribution without modifying the general lead update flow.

#### Acceptance Criteria

1. THE CRM_System SHALL expose a route `PUT /api/leads/assign/:leadId` that is accessible only to authenticated users with `role === 'Admin'`.
2. WHEN the Admin sends `PUT /api/leads/assign/:leadId` with body `{ agentId: "<valid_user_id>" }`, THE Lead_Controller SHALL update the lead's `assignedTo` field to the provided `agentId` and return the updated lead.
3. IF the `:leadId` does not correspond to an existing Lead, THEN THE Lead_Controller SHALL return HTTP 404 with a descriptive error message.
4. IF the request body does not contain `agentId`, THEN THE Lead_Controller SHALL return HTTP 400 with a descriptive error message.
5. IF a non-Admin user calls `PUT /api/leads/assign/:leadId`, THEN THE CRM_System SHALL return HTTP 403 Forbidden.
6. WHEN `agentId` is `null`, THE Lead_Controller SHALL set `assignedTo` to `null`, effectively unassigning the lead.

---

### Requirement 6: Preserve Existing Lead Visibility Rules

**User Story:** As a system architect, I want lead visibility to remain unchanged after adding the assignment feature, so that admins still see all leads and agents still see only their own leads.

#### Acceptance Criteria

1. WHILE a user has `role === 'Admin'`, THE Lead_Controller SHALL return all leads regardless of the `assignedTo` value.
2. WHILE a user has `role === 'Agent'`, THE Lead_Controller SHALL return only leads where `lead.user === agent._id`, regardless of the `assignedTo` value.
3. THE CRM_System SHALL NOT change the query logic in `getAllLeads` to filter by `assignedTo` for either role.
4. FOR ALL leads in the system, assigning or unassigning a lead SHALL NOT change which users can retrieve that lead via `GET /api/leads`.

---

### Requirement 7: Admin Dashboard — Assigned To Column

**User Story:** As an Admin, I want to see who each lead is assigned to in the leads table, so that I can track lead distribution at a glance.

#### Acceptance Criteria

1. WHEN the Admin views the leads table, THE Dashboard SHALL display an "Assigned To" column for every lead row.
2. WHEN a lead's `assignedTo` is `null`, THE Dashboard SHALL display "Unassigned" in the "Assigned To" column.
3. WHEN a lead's `assignedTo` references a User, THE Dashboard SHALL display that user's name in the "Assigned To" column.
4. THE Lead_Controller SHALL populate the `assignedTo` field with `name` when returning leads to an Admin.
5. THE Dashboard SHALL NOT display the "Assigned To" column when the logged-in user is an Agent.

---

### Requirement 8: Admin Dashboard — Assign Lead Button

**User Story:** As an Admin, I want an "Assign Lead" button per lead row that opens an agent dropdown, so that I can assign leads to agents directly from the dashboard.

#### Acceptance Criteria

1. WHEN the Admin views the leads table, THE Dashboard SHALL render an "Assign" button in the actions cell of each lead row.
2. WHEN the Admin clicks the "Assign" button for a lead, THE Dashboard SHALL display a dropdown list of available agents fetched from `GET /api/auth/agents`.
3. WHEN the Admin selects an agent from the dropdown, THE Dashboard SHALL call `PUT /api/leads/assign/:leadId` with the selected agent's `_id` as `agentId`.
4. WHEN the assignment API call succeeds, THE Dashboard SHALL refresh the leads list to reflect the updated "Assigned To" value.
5. IF the assignment API call fails, THEN THE Dashboard SHALL display an error message to the Admin.
6. THE Dashboard SHALL NOT render the "Assign" button when the logged-in user is an Agent.
