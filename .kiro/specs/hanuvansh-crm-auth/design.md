# Design Document: Hanuvansh CRM Authentication System

## Overview

The Hanuvansh CRM Authentication System is a full-stack MERN application that provides secure, JWT-based authentication with role-based access control. The system is architected as two separate applications: a Node.js/Express backend API and a React frontend, communicating via RESTful HTTP endpoints.

The authentication flow follows industry-standard practices: users register with credentials that are securely hashed using bcrypt, log in to receive JWT tokens, and use those tokens to access protected resources. The system supports two distinct roles (Admin and Sales Agent) to enable future feature differentiation.

This design prioritizes security, maintainability, and extensibility, establishing a solid foundation for future CRM features.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Frontend Application                 │ │
│  │  - Login/Register UI                                    │ │
│  │  - Protected Routes                                     │ │
│  │  - Token Management                                     │ │
│  │  - API Client                                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            │ (JWT in Authorization header)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Backend API                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Routes Layer                                           │ │
│  │  - /api/auth/register                                   │ │
│  │  - /api/auth/login                                      │ │
│  │  - /api/auth/profile                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Middleware Layer                                       │ │
│  │  - Authentication Middleware (JWT verification)         │ │
│  │  - Role Authorization Middleware                        │ │
│  │  - Validation Middleware                                │ │
│  │  - Error Handler Middleware                             │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Controller Layer                                       │ │
│  │  - AuthController (business logic)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Model Layer                                            │ │
│  │  - User Model (Mongoose schema)                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ MongoDB Driver
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB Database                        │
│  - users collection                                          │
│    { _id, name, email, password, role, createdAt }          │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- Node.js (runtime environment)
- Express.js (web framework)
- MongoDB (database)
- Mongoose (ODM)
- bcryptjs (password hashing)
- jsonwebtoken (JWT generation/verification)
- express-validator (input validation)
- dotenv (environment configuration)
- cors (cross-origin resource sharing)

**Frontend:**
- React 18+ (UI library)
- React Router v6 (routing)
- Axios (HTTP client)
- Context API (state management)
- CSS3/Modern CSS (styling)

### Project Structure

```
hanuvansh-crm-auth/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Database connection
│   │   ├── controllers/
│   │   │   └── authController.js     # Authentication business logic
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification middleware
│   │   │   ├── roleAuth.js           # Role-based authorization
│   │   │   └── errorHandler.js       # Global error handler
│   │   ├── models/
│   │   │   └── User.js               # User Mongoose model
│   │   ├── routes/
│   │   │   └── authRoutes.js         # Authentication routes
│   │   ├── utils/
│   │   │   └── validators.js         # Input validation schemas
│   │   └── server.js                 # Application entry point
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── PrivateRoute.jsx
│   │   │   └── dashboard/
│   │   │       └── Dashboard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Authentication state management
│   │   ├── services/
│   │   │   └── api.js                # API client configuration
│   │   ├── utils/
│   │   │   └── validators.js         # Client-side validation
│   │   ├── App.jsx                   # Main application component
│   │   ├── App.css                   # Global styles
│   │   └── index.js                  # Application entry point
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
└── README.md
```

## Components and Interfaces

### Backend Components

#### 1. User Model (Mongoose Schema)

```javascript
{
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['Admin', 'Sales_Agent'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

**Methods:**
- `comparePassword(candidatePassword)`: Compares provided password with hashed password
- Pre-save hook: Automatically hashes password before saving to database

#### 2. Authentication Controller

**Functions:**

`register(req, res, next)`
- Validates input data
- Checks if user already exists
- Hashes password using bcrypt
- Creates new user in database
- Returns success response with user data (excluding password)

`login(req, res, next)`
- Validates input data
- Finds user by email
- Compares password using bcrypt
- Generates JWT token with user payload
- Returns token and user data

`getProfile(req, res, next)`
- Extracts user ID from authenticated request
- Retrieves user from database
- Returns user profile (excluding password)

#### 3. Authentication Middleware

`verifyToken(req, res, next)`
- Extracts JWT from Authorization header
- Verifies token signature and expiration
- Decodes token payload
- Attaches user data to request object
- Calls next() if valid, returns 401 if invalid

#### 4. Role Authorization Middleware

`requireRole(...allowedRoles)`
- Returns middleware function that checks user role
- Compares authenticated user's role against allowed roles
- Calls next() if authorized, returns 403 if forbidden

#### 5. Validation Middleware

Uses express-validator to validate:
- Email format
- Password length and complexity
- Required fields presence
- Data type correctness

### Backend API Endpoints

#### POST /api/auth/register

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "Admin" | "Sales_Agent"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "string",
    "name": "string",
    "email": "string",
    "role": "string",
    "createdAt": "date"
  }
}
```

**Error Response (400/409):**
```json
{
  "success": false,
  "message": "Error message",
  "errors": ["validation error 1", "validation error 2"]
}
```

#### POST /api/auth/login

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_string",
  "user": {
    "_id": "string",
    "name": "string",
    "email": "string",
    "role": "string"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

#### GET /api/auth/profile

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "_id": "string",
    "name": "string",
    "email": "string",
    "role": "string",
    "createdAt": "date"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Not authorized"
}
```

### Frontend Components

#### 1. AuthContext (Context Provider)

**State:**
- `user`: Current authenticated user object or null
- `token`: JWT token string or null
- `loading`: Boolean indicating authentication check in progress
- `isAuthenticated`: Boolean computed from user/token presence

**Methods:**
- `login(email, password)`: Calls login API, stores token, updates state
- `register(userData)`: Calls register API, handles response
- `logout()`: Clears token and user state, redirects to login
- `loadUser()`: Loads user profile using stored token (on app initialization)

**Implementation:**
- Uses localStorage to persist JWT token
- Automatically loads user on mount if token exists
- Provides authentication state to all child components

#### 2. Login Component

**Features:**
- Email and password input fields
- Client-side validation
- Error message display
- Loading state during API call
- Link to registration page
- Calls AuthContext.login() on form submission

#### 3. Register Component

**Features:**
- Name, email, password, and role input fields
- Client-side validation (email format, password length)
- Error message display
- Loading state during API call
- Link to login page
- Calls AuthContext.register() on form submission

#### 4. PrivateRoute Component

**Features:**
- Wraps protected routes
- Checks authentication state from AuthContext
- Redirects to login if not authenticated
- Optionally checks user role for role-based routes
- Renders children if authenticated

#### 5. Dashboard Component

**Features:**
- Displays welcome message with user name
- Shows user role
- Displays user email
- Logout button
- Placeholder for future CRM features

#### 6. Navbar Component

**Features:**
- Application branding
- Navigation links (conditional based on auth state)
- User info display when authenticated
- Logout button when authenticated
- Login/Register links when not authenticated

### API Client Configuration

**Axios Instance:**
- Base URL configured from environment variable
- Request interceptor: Automatically adds JWT token to Authorization header
- Response interceptor: Handles 401 errors by logging out user
- Timeout configuration
- Error handling utilities

## Data Models

### User Document (MongoDB)

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "John Doe",
  email: "john@example.com",
  password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
  role: "Admin",
  createdAt: ISODate("2024-01-15T10:30:00Z")
}
```

**Indexes:**
- Unique index on `email` field for fast lookups and duplicate prevention
- Index on `role` field for role-based queries

**Validation:**
- Email must be valid format and unique
- Password must be at least 8 characters (enforced before hashing)
- Role must be one of: "Admin", "Sales_Agent"
- Name is required and trimmed

### JWT Token Payload

```javascript
{
  userId: "507f1f77bcf86cd799439011",
  email: "john@example.com",
  role: "Admin",
  iat: 1705318200,  // Issued at timestamp
  exp: 1705319100   // Expiration timestamp (15 minutes)
}
```

**Token Configuration:**
- Algorithm: HS256 (HMAC with SHA-256)
- Expiration: 15 minutes (configurable via environment)
- Secret: Stored in environment variable (minimum 32 characters recommended)

## Data Flow Diagrams

### Registration Flow

```
User → Frontend Register Form
  ↓ (submit with name, email, password, role)
Frontend validates input
  ↓ (POST /api/auth/register)
Backend validates input
  ↓
Backend checks if email exists
  ↓ (if unique)
Backend hashes password with bcrypt
  ↓
Backend saves user to MongoDB
  ↓
Backend returns success response
  ↓
Frontend displays success message
  ↓
Frontend redirects to login page
```

### Login Flow

```
User → Frontend Login Form
  ↓ (submit with email, password)
Frontend validates input
  ↓ (POST /api/auth/login)
Backend validates input
  ↓
Backend finds user by email
  ↓ (if found)
Backend compares password with bcrypt
  ↓ (if match)
Backend generates JWT token
  ↓
Backend returns token + user data
  ↓
Frontend stores token in localStorage
  ↓
Frontend updates AuthContext state
  ↓
Frontend redirects to dashboard
```

### Protected Route Access Flow

```
User → Navigates to protected route
  ↓
PrivateRoute checks AuthContext
  ↓ (if authenticated)
Frontend makes API request
  ↓ (includes JWT in Authorization header)
Backend auth middleware extracts token
  ↓
Backend verifies token signature
  ↓ (if valid)
Backend decodes token payload
  ↓
Backend attaches user to request
  ↓
Backend controller processes request
  ↓
Backend returns response
  ↓
Frontend displays data
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Authentication Properties

**Property 1: Successful registration creates database entry**
*For any* valid user registration data (name, email, password, role), submitting the data should result in a new user document in the database with matching field values (except password, which should be hashed).
**Validates: Requirements 1.1**

**Property 2: Duplicate email rejection**
*For any* email address, if a user with that email already exists, attempting to register another user with the same email should be rejected with an appropriate error.
**Validates: Requirements 1.2**

**Property 3: Password hashing and response sanitization**
*For any* user registration or API response, the password should never be stored in plaintext in the database, and password hashes should never be included in API responses.
**Validates: Requirements 1.3, 1.4, 6.2, 6.3**

**Property 4: Email format validation**
*For any* registration or login attempt, if the email does not follow standard email format (contains @, valid domain structure), the request should be rejected with a validation error.
**Validates: Requirements 1.5**

**Property 5: Password length validation**
*For any* registration attempt, if the password is shorter than 8 characters, the request should be rejected with a validation error.
**Validates: Requirements 1.6**

**Property 6: Required field validation**
*For any* registration attempt with one or more missing required fields (name, email, password, role), the request should be rejected with detailed validation errors indicating which fields are missing.
**Validates: Requirements 1.7**

**Property 7: Valid credentials authentication**
*For any* user in the database, submitting their correct email and password to the login endpoint should result in successful authentication and return a JWT token.
**Validates: Requirements 2.1, 2.2**

**Property 8: Invalid credentials rejection**
*For any* login attempt where the email doesn't exist or the password doesn't match, the request should be rejected with an authentication error.
**Validates: Requirements 2.3**

**Property 9: JWT token payload completeness**
*For any* successful login, the returned JWT token should contain userId, email, and role in its decoded payload.
**Validates: Requirements 2.4, 3.3**

**Property 10: JWT token expiration**
*For any* generated JWT token, it should have an expiration time set (exp claim present in payload).
**Validates: Requirements 2.5**

**Property 11: Token persistence**
*For any* successful login in the frontend, the JWT token should be stored in localStorage and retrievable for subsequent requests.
**Validates: Requirements 2.6, 5.1**

### Authorization Properties

**Property 12: Role assignment validation**
*For any* user creation attempt, the role must be exactly one of the allowed values (Admin or Sales_Agent), and invalid roles should be rejected with a validation error.
**Validates: Requirements 3.1**

**Property 13: Role-based route protection**
*For any* role-restricted route and any authenticated user, if the user's role is not in the allowed roles for that route, the request should be rejected with a 403 Forbidden error.
**Validates: Requirements 3.4, 3.5**

**Property 14: Authentication middleware protection**
*For any* protected route, requests without a valid JWT token should be rejected with a 401 Unauthorized error, and requests with valid tokens should be processed.
**Validates: Requirements 4.1, 4.3**

**Property 15: Expired token rejection**
*For any* JWT token that has passed its expiration time, requests using that token should be rejected with a token expiration error.
**Validates: Requirements 4.4**

**Property 16: Frontend route guard redirection**
*For any* protected route in the frontend, if the user is not authenticated (no valid token), attempting to access the route should redirect to the login page.
**Validates: Requirements 4.5**

### Session Management Properties

**Property 17: Session persistence across page refresh**
*For any* authenticated user, refreshing the page should restore the authentication state if a valid token exists in localStorage.
**Validates: Requirements 5.2**

**Property 18: Logout state cleanup**
*For any* authenticated user, performing a logout should clear all authentication data from localStorage and redirect to the login page.
**Validates: Requirements 5.3, 5.4**

**Property 19: Unauthorized error handling**
*For any* API request that returns a 401 Unauthorized error, the frontend should clear authentication data and redirect to the login page.
**Validates: Requirements 5.5**

### Error Handling Properties

**Property 20: Consistent error response format**
*For any* error that occurs in the backend API, the error response should follow a consistent format with success: false, message, and optional errors array.
**Validates: Requirements 9.1**

**Property 21: Appropriate HTTP status codes**
*For any* error type (validation: 400, unauthorized: 401, forbidden: 403, not found: 404, conflict: 409, server error: 500), the response should include the appropriate HTTP status code.
**Validates: Requirements 9.2**

**Property 22: Error logging**
*For any* error that occurs in the backend, the error should be logged with sufficient detail for debugging.
**Validates: Requirements 9.3**

**Property 23: Sensitive information protection in errors**
*For any* error response, sensitive information (database details, stack traces in production, internal paths) should not be exposed to the client.
**Validates: Requirements 9.4**

**Property 24: User-friendly error display**
*For any* API error response received by the frontend, a user-friendly error message should be displayed in the UI.
**Validates: Requirements 9.5**

### Input Validation Properties

**Property 25: Comprehensive input validation**
*For any* API endpoint, all incoming request data should be validated before processing, and invalid data should be rejected.
**Validates: Requirements 10.1**

**Property 26: Detailed validation error messages**
*For any* validation failure, the error response should include detailed messages indicating which fields failed validation and why.
**Validates: Requirements 10.2**

**Property 27: Input sanitization**
*For any* user input, potentially malicious content (SQL injection patterns, XSS scripts) should be sanitized or rejected to prevent injection attacks.
**Validates: Requirements 10.3**

**Property 28: Frontend validation**
*For any* form submission in the frontend, client-side validation should catch invalid inputs (email format, password length) before making API requests.
**Validates: Requirements 10.4, 10.5, 10.6**

### Profile Access Properties

**Property 29: Profile data completeness and sanitization**
*For any* authenticated user requesting their profile, the response should include name, email, role, and createdAt, but should never include the password or password hash.
**Validates: Requirements 12.2**

**Property 30: Profile endpoint authentication requirement**
*For any* request to the profile endpoint without valid authentication, the request should be rejected with a 401 Unauthorized error.
**Validates: Requirements 12.3**

**Property 31: Profile display in UI**
*For any* authenticated user, the frontend should display the user's profile information (name, email, role) in the dashboard or profile section.
**Validates: Requirements 12.4, 12.5**

## Error Handling

### Backend Error Handling Strategy

**Global Error Handler Middleware:**
- Catches all errors thrown in routes and controllers
- Determines error type and appropriate status code
- Formats error response consistently
- Logs errors with stack traces (development) or sanitized messages (production)
- Never exposes sensitive information to clients

**Error Types and Status Codes:**

1. **Validation Errors (400 Bad Request)**
   - Missing required fields
   - Invalid data format
   - Failed validation rules
   - Response includes detailed field-level errors

2. **Authentication Errors (401 Unauthorized)**
   - Invalid credentials
   - Missing JWT token
   - Invalid JWT token
   - Expired JWT token

3. **Authorization Errors (403 Forbidden)**
   - Insufficient permissions
   - Role-based access denied

4. **Resource Errors (404 Not Found)**
   - User not found
   - Route not found

5. **Conflict Errors (409 Conflict)**
   - Duplicate email registration
   - Unique constraint violations

6. **Server Errors (500 Internal Server Error)**
   - Database connection failures
   - Unexpected exceptions
   - Third-party service failures

**Error Response Format:**

```javascript
{
  success: false,
  message: "Human-readable error message",
  errors: ["Detailed error 1", "Detailed error 2"], // Optional, for validation
  statusCode: 400 // Included for consistency
}
```

**Error Logging:**
- Development: Full stack traces and detailed error information
- Production: Sanitized error messages, stack traces logged server-side only
- Use structured logging with timestamps, request IDs, and context

### Frontend Error Handling Strategy

**API Error Interceptor:**
- Axios response interceptor catches all API errors
- Extracts error message from response
- Handles specific status codes:
  - 401: Clear auth state, redirect to login
  - 403: Show "Access Denied" message
  - 400: Display validation errors
  - 500: Show generic "Server Error" message

**User Feedback:**
- Display error messages in toast notifications or inline form errors
- Validation errors shown next to relevant form fields
- Loading states prevent duplicate submissions
- Clear error messages on user input change

**Error Boundaries (React):**
- Catch rendering errors in component tree
- Display fallback UI instead of blank screen
- Log errors for debugging

## Testing Strategy

### Dual Testing Approach

The authentication system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples and edge cases
- Integration between components
- Error conditions with specific inputs
- UI component rendering and interactions

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Invariants that must always be maintained
- Round-trip properties (e.g., hash/compare, encode/decode)

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs with specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Backend Testing

**Technology:**
- Jest (test framework)
- Supertest (HTTP assertions)
- MongoDB Memory Server (in-memory database for tests)
- fast-check (property-based testing library for JavaScript)

**Unit Test Coverage:**

1. **Authentication Controller Tests**
   - Registration with valid data returns 201
   - Registration with duplicate email returns 409
   - Login with valid credentials returns token
   - Login with invalid credentials returns 401
   - Profile endpoint returns user data for authenticated user
   - Profile endpoint returns 401 for unauthenticated request

2. **Middleware Tests**
   - Auth middleware accepts valid JWT
   - Auth middleware rejects missing JWT
   - Auth middleware rejects invalid JWT
   - Auth middleware rejects expired JWT
   - Role middleware allows authorized roles
   - Role middleware blocks unauthorized roles

3. **Model Tests**
   - User model validates required fields
   - User model hashes password on save
   - User model comparePassword method works correctly
   - User model enforces unique email constraint

4. **Validation Tests**
   - Email validation rejects invalid formats
   - Password validation enforces minimum length
   - Role validation rejects invalid roles
   - Required field validation catches missing fields

**Property-Based Test Coverage:**

Each property test should run a minimum of 100 iterations with randomized inputs.

1. **Property Test: Password Hashing (Property 3)**
   - **Tag:** Feature: hanuvansh-crm-auth, Property 3: Password hashing and response sanitization
   - Generate random passwords
   - Register users with those passwords
   - Verify stored password ≠ plaintext password
   - Verify password not in API response

2. **Property Test: Email Uniqueness (Property 2)**
   - **Tag:** Feature: hanuvansh-crm-auth, Property 2: Duplicate email rejection
   - Generate random user data
   - Register user successfully
   - Attempt to register again with same email
   - Verify second registration fails with 409

3. **Property Test: JWT Token Payload (Property 9)**
   - **Tag:** Feature: hanuvansh-crm-auth, Property 9: JWT token payload completeness
   - Generate random valid users
   - Login and receive token
   - Decode token
   - Verify userId, email, role present in payload

4. **Property Test: Role Validation (Property 12)**
   - **Tag:** Feature: hanuvansh-crm-auth, Property 12: Role assignment validation
   - Generate random invalid role values
   - Attempt registration with invalid roles
   - Verify rejection with validation error

5. **Property Test: Authentication Round Trip (Property 7)**
   - **Tag:** Feature: hanuvansh-crm-auth, Property 7: Valid credentials authentication
   - Generate random valid user data
   - Register user
   - Login with same credentials
   - Verify successful authentication

6. **Property Test: Input Sanitization (Property 27)**
   - **Tag:** Feature: hanuvansh-crm-auth, Property 27: Input sanitization
   - Generate inputs with SQL injection patterns
   - Generate inputs with XSS scripts
   - Submit to various endpoints
   - Verify inputs are sanitized or rejected

### Frontend Testing

**Technology:**
- Jest (test framework)
- React Testing Library (component testing)
- MSW (Mock Service Worker for API mocking)
- fast-check (property-based testing)

**Unit Test Coverage:**

1. **Component Tests**
   - Login component renders correctly
   - Login component submits form data
   - Login component displays error messages
   - Register component validates inputs
   - Register component submits form data
   - Dashboard displays user information
   - PrivateRoute redirects unauthenticated users
   - PrivateRoute renders children for authenticated users

2. **Context Tests**
   - AuthContext provides authentication state
   - Login updates context state
   - Logout clears context state
   - Token persistence works across refreshes

3. **Integration Tests**
   - Complete registration flow
   - Complete login flow
   - Complete logout flow
   - Protected route access flow

**Property-Based Test Coverage:**

1. **Property Test: Token Persistence (Property 11)**
   - **Tag:** Feature: hanuvansh-crm-auth, Property 11: Token persistence
   - Generate random valid tokens
   - Store in localStorage via login
   - Verify token retrievable
   - Verify token used in subsequent requests

2. **Property Test: Frontend Validation (Property 28)**
   - **Tag:** Feature: hanuvansh-crm-auth, Property 28: Frontend validation
   - Generate invalid email formats
   - Generate invalid password lengths
   - Submit forms
   - Verify client-side validation catches errors before API call

3. **Property Test: Error Display (Property 24)**
   - **Tag:** Feature: hanuvansh-crm-auth, Property 24: User-friendly error display
   - Generate various API error responses
   - Trigger errors in components
   - Verify user-friendly messages displayed

### Integration Testing

**End-to-End Scenarios:**
1. New user registration → login → access dashboard
2. Existing user login → access protected route → logout
3. Invalid credentials → error display → retry with valid credentials
4. Token expiration → automatic logout → re-login
5. Role-based access → Admin accesses admin route → Sales Agent blocked

### Test Configuration

**Environment:**
- Separate test database (MongoDB Memory Server)
- Test environment variables
- Mock external services
- Isolated test execution (no shared state)

**Coverage Goals:**
- Backend: 80%+ code coverage
- Frontend: 75%+ code coverage
- All critical paths covered by both unit and property tests
- All error scenarios tested

**Continuous Integration:**
- Run all tests on every commit
- Block merges if tests fail
- Generate coverage reports
- Run property tests with increased iterations (1000+) in CI

### Manual Testing Checklist

While automated tests provide comprehensive coverage, manual testing should verify:
- UI responsiveness on actual devices
- Visual design consistency
- User experience flow
- Accessibility with screen readers
- Browser compatibility (Chrome, Firefox, Safari, Edge)
- Performance under load
