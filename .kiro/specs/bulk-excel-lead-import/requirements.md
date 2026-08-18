# Requirements Document

## Introduction

This feature adds bulk lead import capability to the Hanuvansh Real Estate CRM via Excel (.xlsx) file upload. Admin users can upload client-provided Excel files containing lead data, which the system parses, validates, normalizes, deduplicates, and inserts into the existing Lead collection. The feature extends the Lead schema with optional real-estate-specific fields (service type, property type, locality, configuration, price, building name, address) without breaking existing functionality.

## Glossary

- **Import_System**: The backend service responsible for receiving Excel files, parsing rows, validating data, detecting duplicates, and creating Lead documents in MongoDB.
- **Import_UI**: The frontend React component providing the Admin upload interface, file preview, progress feedback, and result summary display.
- **Admin**: A user with role "Admin" who has permission to import leads, see all leads, and assign leads.
- **Excel_File**: A `.xlsx` file containing lead data with columns: Service Type, Property Type, Lead Date, Lead Name, Lead Phone Number, Locality, Configuration, Price, Building/Project Name, Address, Notes.
- **Phone_Normalizer**: A utility that strips formatting characters (parentheses, dashes, spaces, country code prefix like "+91") from phone number strings, retaining only digits.
- **Duplicate_Lead**: A lead whose normalized phone number matches either an existing lead in the database or another row within the same uploaded Excel file.
- **Import_Result**: A structured response object summarizing the outcome of an import operation, including counts and row-level details.
- **Lead_Schema**: The Mongoose schema defining the structure of lead documents in the CRM database.

## Requirements

### Requirement 1: Admin-Only Access Control

**User Story:** As an Admin, I want the bulk import feature restricted to my role, so that unauthorized users cannot mass-create leads in the system.

#### Acceptance Criteria

1. WHEN a request is made to `POST /api/leads/import`, THE Import_System SHALL require a valid JWT token via the verifyToken middleware.
2. WHEN an authenticated request is made to `POST /api/leads/import`, THE Import_System SHALL enforce the Admin role via the requireRole('Admin') middleware.
3. IF a non-Admin user attempts to access `POST /api/leads/import`, THEN THE Import_System SHALL return HTTP 403 with message "Access denied. Required role: Admin".
4. IF an unauthenticated request is made to `POST /api/leads/import`, THEN THE Import_System SHALL return HTTP 401 with message "Access denied. No token provided."

### Requirement 2: File Upload Validation

**User Story:** As an Admin, I want the system to validate uploaded files before processing, so that only valid Excel files are accepted and the server is protected from malicious uploads.

#### Acceptance Criteria

1. WHEN a file is uploaded to the import endpoint, THE Import_System SHALL accept only files with the `.xlsx` extension.
2. WHEN a file is uploaded to the import endpoint, THE Import_System SHALL validate the MIME type is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
3. WHEN a file is uploaded to the import endpoint, THE Import_System SHALL reject files exceeding 5 MB in size.
4. IF no file is provided in the request, THEN THE Import_System SHALL return HTTP 400 with message "No file provided".
5. IF the file extension is not `.xlsx`, THEN THE Import_System SHALL return HTTP 400 with message "Invalid file type. Only .xlsx files are accepted".
6. IF the file exceeds the size limit, THEN THE Import_System SHALL return HTTP 400 with message "File size exceeds 5 MB limit".
7. THE Import_System SHALL process uploaded files in memory without persisting them to the filesystem.

### Requirement 3: Excel Parsing and Field Mapping

**User Story:** As an Admin, I want the system to correctly parse Excel columns and map them to lead fields, so that imported data is structured correctly in the CRM.

#### Acceptance Criteria

1. WHEN a valid Excel file is received, THE Import_System SHALL parse it using the `xlsx` npm package.
2. WHEN parsing the Excel file, THE Import_System SHALL read data from the first worksheet.
3. WHEN mapping columns, THE Import_System SHALL map "Lead Name" to the `name` field.
4. WHEN mapping columns, THE Import_System SHALL map "Lead Phone Number" to the `number` field after normalization.
5. WHEN mapping columns, THE Import_System SHALL map "Lead Date" to the `date` field, parsing date strings in "DD/MM/YYYY" format.
6. WHEN mapping columns, THE Import_System SHALL map "Notes" to the `remark` field.
7. WHEN mapping columns, THE Import_System SHALL map "Service Type" to the `serviceType` field on the Lead schema.
8. WHEN mapping columns, THE Import_System SHALL map "Property Type" to the `propertyType` field on the Lead schema.
9. WHEN mapping columns, THE Import_System SHALL map "Locality" to the `locality` field on the Lead schema.
10. WHEN mapping columns, THE Import_System SHALL map "Configuration" to the `configuration` field on the Lead schema.
11. WHEN mapping columns, THE Import_System SHALL map "Price" to the `price` field on the Lead schema.
12. WHEN mapping columns, THE Import_System SHALL map "Building/Project Name" to the `buildingName` field on the Lead schema.
13. WHEN mapping columns, THE Import_System SHALL map "Address" to the `address` field on the Lead schema.

### Requirement 4: Phone Number Normalization

**User Story:** As an Admin, I want phone numbers normalized before import, so that duplicate detection works correctly regardless of formatting differences in the Excel file.

#### Acceptance Criteria

1. WHEN processing a phone number from the Excel file, THE Phone_Normalizer SHALL remove all parentheses, dashes, spaces, and plus signs.
2. WHEN processing a phone number with a country code prefix (e.g., "91" as the first two digits of a 12-digit number), THE Phone_Normalizer SHALL strip the country code and retain the last 10 digits.
3. WHEN processing a phone number like "(+91)-7600331516", THE Phone_Normalizer SHALL produce "7600331516".
4. WHEN processing a phone number that is already 10 digits with no formatting, THE Phone_Normalizer SHALL return it unchanged.
5. FOR ALL valid phone number inputs, normalizing then normalizing again SHALL produce the same result (idempotence property).

### Requirement 5: Duplicate Detection

**User Story:** As an Admin, I want the system to detect and skip duplicate leads during import, so that existing data is not overwritten and the database remains clean.

#### Acceptance Criteria

1. WHEN processing imported rows, THE Import_System SHALL check each normalized phone number against all existing leads in the database.
2. WHEN processing imported rows, THE Import_System SHALL check each normalized phone number against all other rows within the same uploaded file.
3. IF a row's normalized phone number matches an existing lead in the database, THEN THE Import_System SHALL skip that row and record it as a duplicate.
4. IF multiple rows within the same file share the same normalized phone number, THEN THE Import_System SHALL import only the first occurrence and skip subsequent duplicates.
5. THE Import_System SHALL NOT delete or overwrite any existing leads during import.
6. THE Import_System SHALL NOT modify any existing leads during import.

### Requirement 6: Row Validation

**User Story:** As an Admin, I want the system to validate each row before import, so that only complete and valid lead data enters the system.

#### Acceptance Criteria

1. WHEN validating a row, THE Import_System SHALL require the "Lead Name" column to contain a non-empty trimmed string.
2. WHEN validating a row, THE Import_System SHALL require the "Lead Phone Number" column to contain a value that normalizes to exactly 10 digits.
3. IF a row is missing the lead name, THEN THE Import_System SHALL skip that row and record it as invalid with reason "Name is required".
4. IF a row's phone number does not normalize to 10 digits, THEN THE Import_System SHALL skip that row and record it as invalid with reason "Invalid phone number".
5. WHEN a row has an unparseable date in the "Lead Date" column, THE Import_System SHALL use the current date as the default value and still import the row.

### Requirement 7: Lead Creation Defaults

**User Story:** As an Admin, I want imported leads to have correct ownership and default values, so that they integrate seamlessly with the existing CRM workflow.

#### Acceptance Criteria

1. WHEN creating a lead from an imported row, THE Import_System SHALL set the `user` field to the importing Admin's user ID.
2. WHEN creating a lead from an imported row, THE Import_System SHALL set the `createdBy` field to the importing Admin's user ID.
3. WHEN creating a lead from an imported row, THE Import_System SHALL set the `assignedTo` field to null.
4. WHEN creating a lead from an imported row, THE Import_System SHALL set the `assignedBy` field to null.
5. WHEN creating a lead from an imported row, THE Import_System SHALL set the `status` field to "CNR".
6. WHEN creating a lead from an imported row, THE Import_System SHALL set the `leadSource` field to "Other".

### Requirement 8: Bulk Insert Operation

**User Story:** As an Admin, I want the import to be efficient for large files, so that hundreds of leads can be imported without timeouts or performance degradation.

#### Acceptance Criteria

1. WHEN all rows have been validated and deduplicated, THE Import_System SHALL insert valid leads using MongoDB `insertMany` with the `ordered: false` option.
2. IF individual documents fail during insertMany (e.g., unexpected validation errors), THEN THE Import_System SHALL continue inserting remaining documents and report failures in the result.
3. THE Import_System SHALL handle Excel files containing up to 1000 rows without timing out.

### Requirement 9: Import Result Response

**User Story:** As an Admin, I want a detailed summary after import, so that I know exactly how many leads were imported and which rows were skipped and why.

#### Acceptance Criteria

1. WHEN the import operation completes, THE Import_System SHALL return HTTP 200 with a JSON response containing `totalRows`, `imported`, `duplicates`, and `invalid` counts.
2. WHEN the import operation completes, THE Import_System SHALL include a `duplicateDetails` array listing each skipped duplicate with its row number, name, and phone number.
3. WHEN the import operation completes, THE Import_System SHALL include an `invalidDetails` array listing each invalid row with its row number and the reason for rejection.
4. WHEN zero rows are successfully imported, THE Import_System SHALL still return HTTP 200 with the summary showing imported count as 0.

### Requirement 10: Lead Schema Extension

**User Story:** As an Admin, I want the new Excel fields stored on lead documents, so that real-estate-specific data (property type, locality, configuration, etc.) is preserved in the CRM.

#### Acceptance Criteria

1. THE Lead_Schema SHALL include an optional `serviceType` field of type String with default empty string.
2. THE Lead_Schema SHALL include an optional `propertyType` field of type String with default empty string.
3. THE Lead_Schema SHALL include an optional `locality` field of type String with default empty string.
4. THE Lead_Schema SHALL include an optional `configuration` field of type String with default empty string.
5. THE Lead_Schema SHALL include an optional `price` field of type String with default empty string.
6. THE Lead_Schema SHALL include an optional `buildingName` field of type String with default empty string.
7. THE Lead_Schema SHALL include an optional `address` field of type String with default empty string.
8. WHEN existing leads are queried after schema extension, THE Lead_Schema SHALL return existing leads without errors (backward compatible).

### Requirement 11: Frontend Upload Interface

**User Story:** As an Admin, I want a clear upload interface in the dashboard, so that I can easily select and import Excel files with visual feedback.

#### Acceptance Criteria

1. WHILE the user role is Admin, THE Import_UI SHALL display an "Import Leads" button in the dashboard header area.
2. WHEN the Admin clicks "Import Leads", THE Import_UI SHALL open a modal or section with a file input accepting only `.xlsx` files.
3. WHEN a file is selected, THE Import_UI SHALL display the file name and total row count (excluding header row).
4. WHEN a file is selected, THE Import_UI SHALL display a preview of the first 5 data rows in a table format.
5. WHEN the Admin clicks the "Import Leads" confirmation button, THE Import_UI SHALL send the file to `POST /api/leads/import` as multipart/form-data.
6. WHILE the import request is in progress, THE Import_UI SHALL display a loading indicator and disable the import button to prevent double submission.
7. WHEN the import response is received, THE Import_UI SHALL display the result summary showing imported, duplicate, and invalid counts.
8. IF the import request fails, THEN THE Import_UI SHALL display an error message to the Admin.

### Requirement 12: No Breaking Changes

**User Story:** As a system administrator, I want the import feature to integrate without disrupting existing functionality, so that all current CRM operations continue working.

#### Acceptance Criteria

1. THE Import_System SHALL NOT modify the behavior of existing lead CRUD endpoints (POST /api/leads, GET /api/leads, PUT /api/leads/:id, DELETE /api/leads/:id).
2. THE Import_System SHALL NOT modify the behavior of existing lead assignment endpoint (PUT /api/leads/assign/:leadId).
3. THE Import_System SHALL NOT modify the behavior of existing follow-up endpoint (GET /api/leads/today).
4. THE Import_System SHALL NOT modify the behavior of existing authentication or authorization middleware.
5. WHEN new optional fields are added to the Lead schema, THE Lead_Schema SHALL continue to accept lead creation without those fields (all new fields default to empty string).
6. THE Import_UI SHALL NOT alter the existing lead form, lead table, filter, or follow-up sections in the Dashboard component.
