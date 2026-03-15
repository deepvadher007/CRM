# Design Document: CRM Lead Assignment

## Overview

This feature covers two coordinated changes to the Hanuvansh CRM (MERN stack):

1. **PDF System Removal** — Strip all multer-based PDF upload infrastructure from the backend and all PDF-related UI from the frontend Dashboard. This is a pure deletion with no replacement.

2. **Lead Assignment** — Add an optional `assignedTo` field to leads, expose a dedicated Admin-only `PUT /api/leads/assign/:leadId` endpoint, and surface an "Assigned To" column plus an inline agent-assignment dropdown in the Admin Dashboard view.

The two changes are bundled because they touch the same files (Lead model, lead controller, lead routes, Dashboard component) and should be shipped together to avoid intermediate broken states.

---

## Architecture

The system follows the existing MERN layered architecture:

```
React Frontend (Dashboard.jsx)
        │
        │  HTTP (Axios via api.js)
        ▼
Express Router (leadRoutes.js)
        │
        ├── verifyToken (auth.js)
        ├── requireRole('Admin') (roleAuth.js)
        │
        ▼
Lead Controller (leadController.js)
        │
        ▼
Mongoose Lead Model (Lead.js)
        │
        ▼
MongoDB Atlas
```

No new architectural layers are introduced. The assignment endpoint slots into the existing controller/route/model pattern.

### Key Design Decisions

- **Separate assignment endpoint** (`PUT /api/leads/assign/:leadId`) rather than reusing `PUT /api/leads/:id`. This keeps the general update route free of Admin-only logic and makes authorization explicit at the route level.
- **`assignedTo` is nullable** — `null` means unassigned. This avoids a separate "unassign" endpoint; passing `agentId: null` handles both assign and unassign.
- **Visibility rules are unchanged** — `getAllLeads` continues to filter by `lead.user` for agents. `assignedTo` is purely informational for the Admin view.
- **Inline dropdown UI** — Rather than a modal, the assign UI uses a per-row inline dropdown toggled by `assigningLeadId` state. This keeps the interaction lightweight and consistent with the existing phone dropdown pattern.

---

## Components and Interfaces

### Backend

#### Lead Model (`backend/src/models/Lead.js`)

Changes:
- Remove `pdfFile` field
- Add `assignedTo` field

#### Lead Controller (`backend/src/controllers/leadController.js`)

Changes:
- Remove `uploadPDF` function
- Add `assignLead` function
- Update `getAllLeads` to `.populate('assignedTo', 'name')` for Admin queries

**`assignLead` interface:**
```
PUT /api/leads/assign/:leadId
Authorization: Bearer <token>  (Admin only)
Body: { agentId: string | null }

Success 200: { success: true, message: string, lead: Lead }
Error 400:   { success: false, message: 'agentId is required in request body' }
Error 404:   { success: false, message: 'Lead not found' }
Error 403:   (handled by requireRole middleware)
```

#### Lead Routes (`backend/src/routes/leadRoutes.js`)

Changes:
- Remove `upload` (multer) import and `uploadPDF` import
- Remove `POST /:id/upload-pdf` route
- Add `PUT /assign/:leadId` route with `verifyToken` + `requireRole('Admin')`

**Route ordering note:** `/assign/:leadId` must be declared before `/:id` routes to avoid Express matching `assign` as an `:id` parameter.

#### Server (`backend/src/server.js`)

Changes:
- Remove `app.use('/uploads', express.static(...))` line
- Remove `path` import if no longer used elsewhere

#### Deleted Files

- `backend/src/config/multer.js` — entire file deleted
- `backend/package.json` — remove `multer` from dependencies

### Frontend

#### Dashboard (`frontend/src/components/dashboard/Dashboard.jsx`)

**State to remove:**
- `uploadingPdf`, `whatsappPhone`, `showWhatsappModal`, `selectedLead`

**Handlers to remove:**
- `handlePDFUpload`, `handleViewPDF`, `handleWhatsAppShare`, `handleWhatsAppShareManual`

**State to add:**
- `assigningLeadId` — `string | null` — tracks which lead row has the assign dropdown open

**UI to remove:**
- `pdf-actions` div in each table row (file input, view PDF button, WhatsApp share button)
- WhatsApp phone number modal at bottom of component

**UI to add (Admin only):**
- "Assigned To" `<th>` in table header
- Per-row `<td>` showing `lead.assignedTo?.name || 'Unassigned'`
- "Assign" button per row that toggles `assigningLeadId`
- Inline agent `<select>` dropdown when `assigningLeadId === lead._id`
- On agent select: call `PUT /api/leads/assign/:leadId`, then `fetchLeads()`
- On error: call `setError(extractErrorMessage(...))`

**`colSpan` update:** The no-data row colspan must be updated to account for the new "Assigned To" column when the user is Admin.

---

## Data Models

### Lead Schema (after changes)

```javascript
{
  user:        ObjectId (ref: User, required),   // owner agent
  createdBy:   ObjectId (ref: User, required),   // creator
  date:        Date (default: now),
  name:        String (required, trim),
  number:      String (required, trim),
  leadFrom:    String (trim, default: ''),
  leadSource:  String (enum, default: 'Own User'),
  remark:      String (trim, default: ''),
  status:      String (enum, required, default: 'CNR'),
  followUpDate: Date,
  assignedTo:  ObjectId (ref: User, default: null),  // NEW
  // pdfFile removed
  timestamps:  true
}
```

### API Response Shape (Admin `GET /api/leads`)

```json
{
  "success": true,
  "count": 5,
  "leads": [
    {
      "_id": "...",
      "name": "John Doe",
      "assignedTo": { "_id": "...", "name": "Agent Name" },
      "createdBy": { "_id": "...", "name": "Admin", "role": "Admin" },
      ...
    }
  ]
}
```

When `assignedTo` is null, the field is `null` (not omitted).

### `PUT /api/leads/assign/:leadId` Request Body

```json
{ "agentId": "<ObjectId string> | null" }
```

`agentId` key must be present. Value may be a valid ObjectId string (assign) or `null` (unassign).

---


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Lead creation without assignedTo defaults to null

*For any* valid lead creation payload that omits the `assignedTo` field, the persisted lead document should have `assignedTo === null`.

**Validates: Requirements 4.2**

---

### Property 2: Lead creation round-trip excludes pdfFile

*For any* valid lead creation payload (name, number, status, etc.), creating the lead and then fetching it should return a document that does not contain a `pdfFile` field.

**Validates: Requirements 2.2**

---

### Property 3: Non-Admin users cannot call the assign endpoint

*For any* user whose role is not `Admin`, calling `PUT /api/leads/assign/:leadId` should return HTTP 403 regardless of the lead or body provided.

**Validates: Requirements 5.1, 5.5**

---

### Property 4: Assign endpoint sets assignedTo to the provided agentId

*For any* existing lead and any valid agentId (including `null`), calling `PUT /api/leads/assign/:leadId` as Admin with `{ agentId }` should result in the lead's `assignedTo` field equaling the provided agentId.

**Validates: Requirements 5.2, 5.6**

---

### Property 5: Admin always sees all leads regardless of assignedTo

*For any* collection of leads with varying `assignedTo` values (null, agent A, agent B), a `GET /api/leads` request by an Admin should return all leads in the collection.

**Validates: Requirements 6.1**

---

### Property 6: Agent visibility is unaffected by assignment

*For any* agent and any collection of leads, a `GET /api/leads` request by that agent should return exactly the leads where `lead.user === agent._id`, regardless of each lead's `assignedTo` value.

**Validates: Requirements 6.2**

---

### Property 7: Admin lead response correctly reflects assignedTo display value

*For any* lead returned to an Admin, if `assignedTo` is null the display value should be `"Unassigned"`, and if `assignedTo` is a populated User object the display value should be that user's `name`.

**Validates: Requirements 7.2, 7.3**

---

### Property 8: Admin GET /api/leads populates assignedTo.name

*For any* lead with a non-null `assignedTo`, the Admin `GET /api/leads` response should include `assignedTo` as an object with a `name` field (not a bare ObjectId string).

**Validates: Requirements 7.4**

---

### Property 9: Agent selection triggers correct assignment API call

*For any* lead row and any agent selected from the dropdown, the Dashboard should call `PUT /api/leads/assign/:leadId` with `{ agentId: selectedAgent._id }` where `:leadId` matches the row's lead `_id`.

**Validates: Requirements 8.3**

---

## Error Handling

### Backend

| Scenario | HTTP Status | Response |
|---|---|---|
| `agentId` key missing from body | 400 | `{ success: false, message: 'agentId is required in request body' }` |
| `:leadId` not found in DB | 404 | `{ success: false, message: 'Lead not found' }` |
| Non-Admin calls assign endpoint | 403 | Handled by `requireRole('Admin')` middleware |
| Unauthenticated request | 401 | Handled by `verifyToken` middleware |
| Invalid ObjectId format for leadId | 500 → should be 400 | Caught by global error handler; consider adding `mongoose.isValidObjectId` guard |

**Recommendation:** Add an `isValidObjectId` check at the top of `assignLead` to return 400 for malformed IDs before hitting the DB.

### Frontend

- Assignment API failure: call `setError(extractErrorMessage(err, 'Failed to assign lead'))` — consistent with existing error handling pattern
- The `assigningLeadId` dropdown should close on successful assignment (reset to `null`) and also on outside-click (reuse the existing `handleClickOutside` pattern)

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests catch concrete bugs at specific inputs and integration points
- Property tests verify universal correctness across randomized inputs

### Property-Based Testing

**Library:** [fast-check](https://github.com/dubzzz/fast-check) for both backend (Jest + fast-check) and frontend (Vitest + fast-check).

Each property test must run a minimum of **100 iterations**.

Each test must include a comment tag in the format:
`// Feature: crm-lead-assignment, Property <N>: <property_text>`

| Property | Test Location | Arbitraries Needed |
|---|---|---|
| P1: assignedTo defaults to null | `leadController.test.js` | `fc.record({ name, number, status })` |
| P2: pdfFile absent after creation | `leadController.test.js` | `fc.record({ name, number, status })` |
| P3: Non-Admin gets 403 on assign | `leadRoutes.test.js` | `fc.constantFrom('Agent')` + random leadId |
| P4: Assign sets assignedTo | `leadController.test.js` | `fc.option(fc.string())` for agentId |
| P5: Admin sees all leads | `leadController.test.js` | `fc.array(fc.record({ assignedTo: fc.option(...) }))` |
| P6: Agent visibility unchanged | `leadController.test.js` | `fc.array(fc.record({ user: fc.string() }))` |
| P7: Display value correctness | `Dashboard.test.jsx` | `fc.option(fc.record({ name: fc.string() }))` for assignedTo |
| P8: assignedTo populated in Admin response | `leadController.test.js` | Seeded leads with known assignedTo |
| P9: Agent selection triggers correct call | `Dashboard.test.jsx` | `fc.array(fc.record({ _id, name }))` for agents |

### Unit Tests

Focus on:
- **Example: upload-pdf route returns 404** — `POST /api/leads/:id/upload-pdf` should return 404 after removal
- **Example: Lead created without pdfFile** — response document has no `pdfFile` key
- **Example: assignedTo field present with null default** — new lead has `assignedTo: null`
- **Example: Admin table shows "Assigned To" header** — render Dashboard as Admin, assert `<th>Assigned To</th>` present
- **Example: Agent table hides "Assigned To" header** — render Dashboard as Agent, assert header absent
- **Example: Assign button present for Admin** — each row has an Assign button
- **Example: Assign button absent for Agent** — no Assign button in Agent view
- **Example: Clicking Assign shows dropdown** — `assigningLeadId` state toggles correctly
- **Example: Successful assignment refreshes leads** — `fetchLeads` called after successful PUT
- **Edge case: missing agentId returns 400**
- **Edge case: non-existent leadId returns 404**
- **Edge case: agentId: null unassigns lead**
- **Edge case: assignment API failure shows error in Dashboard**

### Test Configuration

```javascript
// fast-check configuration for all property tests
fc.assert(fc.asyncProperty(...), { numRuns: 100 });
```
