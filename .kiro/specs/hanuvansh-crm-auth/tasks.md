# Implementation Plan: Hanuvansh CRM Authentication System

## Overview

This implementation plan breaks down the MERN stack authentication system into discrete, incremental coding tasks. The approach follows a bottom-up strategy: first establishing the backend infrastructure and core authentication logic, then building the frontend interface, and finally integrating everything with comprehensive testing.

Each task builds on previous work, ensuring no orphaned code and maintaining a working system at each checkpoint.

## Tasks

- [x] 1. Initialize project structure and dependencies
  - Create root directory with `backend/` and `frontend/` subdirectories
  - Initialize backend: `npm init` in backend directory
  - Initialize frontend: `npx create-react-app frontend`
  - Create `.gitignore` files for both backend and frontend
  - Create backend directory structure: `src/config`, `src/controllers`, `src/middleware`, `src/models`, `src/routes`, `src/utils`
  - Install backend dependencies: express, mongoose, bcryptjs, jsonwebtoken, express-validator, dotenv, cors
  - Install backend dev dependencies: jest, supertest, mongodb-memory-server, nodemon
  - Create `.env.example` file in backend with required variables (PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRE, NODE_ENV)
  - Create root `README.md` with project overview and setup instructions
  - _Requirements: 7.4, 8.1, 8.2, 8.5_

- [ ] 2. Set up backend database configuration
  - [x] 2.1 Create database connection module
    - Implement `backend/src/config/db.js` with MongoDB connection logic using Mongoose
    - Add connection error handling and retry logic
    - Add connection success logging
    - Export connection function
    - _Requirements: 7.3_

  - [x] 2.2 Create environment validation utility
    - Implement `backend/src/config/validateEnv.js` to check required environment variables
    - Validate presence of JWT_SECRET, MONGODB_URI, PORT
    - Throw descriptive errors if variables are missing
    - _Requirements: 7.1, 7.2, 7.5_

- [ ] 3. Implement User model and password security
  - [x] 3.1 Create User Mongoose schema
    - Define User schema in `backend/src/models/User.js` with fields: name, email, password, role, createdAt
    - Add field validations: required fields, email format, password minlength, role enum
    - Create unique index on email field
    - _Requirements: 1.1, 1.5, 1.6, 3.1_

  - [x] 3.2 Add password hashing middleware
    - Implement pre-save hook to hash password with bcrypt (salt rounds: 10)
    - Only hash if password is modified
    - _Requirements: 1.3, 6.1_

  - [x] 3.3 Add password comparison method
    - Implement `comparePassword` instance method using bcrypt.compare
    - Return boolean indicating password match
    - _Requirements: 2.1_

  - [ ]* 3.4 Write property test for password hashing
    - **Property 3: Password hashing and response sanitization**
    - Generate random passwords, register users, verify stored password ≠ plaintext
    - **Validates: Requirements 1.3, 6.2**

- [ ] 4. Implement authentication middleware
  - [x] 4.1 Create JWT verification middleware
    - Implement `backend/src/middleware/auth.js` with `verifyToken` function
    - Extract token from Authorization header (Bearer format)
    - Verify token using jsonwebtoken.verify with JWT_SECRET
    - Decode token and attach user data to req.user
    - Handle missing token, invalid token, and expired token errors
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 4.2 Create role authorization middleware
    - Implement `backend/src/middleware/roleAuth.js` with `requireRole` function
    - Accept array of allowed roles as parameter
    - Check if req.user.role is in allowed roles
    - Return 403 Forbidden if role not authorized
    - _Requirements: 3.4, 3.5_

  - [ ]* 4.3 Write property test for authentication middleware
    - **Property 14: Authentication middleware protection**
    - Test protected routes with/without valid tokens
    - **Validates: Requirements 4.1, 4.3**

  - [ ]* 4.4 Write property test for expired token rejection
    - **Property 15: Expired token rejection**
    - Generate expired tokens, verify rejection
    - **Validates: Requirements 4.4**

- [ ] 5. Implement input validation utilities
  - [x] 5.1 Create validation schemas
    - Implement `backend/src/utils/validators.js` with express-validator chains
    - Create `registerValidation`: validate name, email, password, role
    - Create `loginValidation`: validate email, password
    - Add custom validators for email format and role enum
    - _Requirements: 1.5, 1.6, 1.7, 10.1, 10.2_

  - [x] 5.2 Create input sanitization utility
    - Add sanitization to validation chains (trim, escape)
    - Implement protection against SQL injection and XSS
    - _Requirements: 10.3_

  - [ ]* 5.3 Write property test for input sanitization
    - **Property 27: Input sanitization**
    - Generate malicious inputs (SQL injection, XSS), verify sanitization
    - **Validates: Requirements 10.3**

- [ ] 6. Implement authentication controller
  - [x] 6.1 Create register controller function
    - Implement `backend/src/controllers/authController.js` with `register` function
    - Validate request body using validation results
    - Check if user with email already exists (return 409 if exists)
    - Create new user with hashed password
    - Return success response with user data (exclude password)
    - Handle errors and pass to error handler
    - _Requirements: 1.1, 1.2, 1.4, 1.7_

  - [x] 6.2 Create login controller function
    - Implement `login` function in authController
    - Find user by email
    - Compare password using user.comparePassword method
    - Generate JWT token with payload: userId, email, role
    - Set token expiration (15 minutes)
    - Return token and user data (exclude password)
    - Return 401 for invalid credentials
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 6.3 Create profile controller function
    - Implement `getProfile` function in authController
    - Extract user ID from req.user (set by auth middleware)
    - Find user by ID and exclude password field
    - Return user profile data
    - _Requirements: 12.1, 12.2_

  - [ ]* 6.4 Write property test for email uniqueness
    - **Property 2: Duplicate email rejection**
    - Register user, attempt duplicate registration, verify 409 error
    - **Validates: Requirements 1.2**

  - [ ]* 6.5 Write property test for JWT token payload
    - **Property 9: JWT token payload completeness**
    - Login, decode token, verify userId, email, role present
    - **Validates: Requirements 2.4, 3.3**

  - [ ]* 6.6 Write property test for authentication round trip
    - **Property 7: Valid credentials authentication**
    - Register user, login with same credentials, verify success
    - **Validates: Requirements 2.1, 2.2**

- [ ] 7. Implement error handling middleware
  - [x] 7.1 Create global error handler
    - Implement `backend/src/middleware/errorHandler.js`
    - Catch all errors from routes and controllers
    - Determine appropriate HTTP status code based on error type
    - Format consistent error response: { success: false, message, errors, statusCode }
    - Log errors with appropriate detail (full stack in dev, sanitized in production)
    - Never expose sensitive information in production
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 7.2 Write property test for error response format
    - **Property 20: Consistent error response format**
    - Trigger various errors, verify consistent format
    - **Validates: Requirements 9.1**

  - [ ]* 7.3 Write property test for HTTP status codes
    - **Property 21: Appropriate HTTP status codes**
    - Trigger different error types, verify correct status codes
    - **Validates: Requirements 9.2**

- [ ] 8. Set up authentication routes
  - [x] 8.1 Create auth routes file
    - Implement `backend/src/routes/authRoutes.js`
    - Define POST /register route with validation middleware and register controller
    - Define POST /login route with validation middleware and login controller
    - Define GET /profile route with auth middleware and getProfile controller
    - Export router
    - _Requirements: 1.1, 2.1, 12.1, 12.3_

  - [x] 8.2 Create main server file
    - Implement `backend/src/server.js`
    - Load and validate environment variables
    - Connect to MongoDB
    - Initialize Express app
    - Configure middleware: cors, express.json, express.urlencoded
    - Mount auth routes at /api/auth
    - Add 404 handler for unknown routes
    - Add global error handler middleware
    - Start server on configured PORT
    - _Requirements: 7.1, 7.5, 8.2_

- [x] 9. Checkpoint - Backend core functionality complete
  - Run backend server and verify it starts without errors
  - Test registration endpoint with Postman/curl
  - Test login endpoint and verify JWT token returned
  - Test profile endpoint with valid token
  - Ensure all tests pass, ask the user if questions arise

- [ ] 10. Set up frontend project structure
  - [x] 10.1 Organize frontend directories
    - Create directory structure: `src/components/auth`, `src/components/layout`, `src/components/dashboard`, `src/context`, `src/services`, `src/utils`
    - Install frontend dependencies: axios, react-router-dom
    - Create `.env.example` with REACT_APP_API_URL
    - _Requirements: 7.6, 8.3_

  - [x] 10.2 Create API client configuration
    - Implement `frontend/src/services/api.js`
    - Create axios instance with base URL from environment
    - Add request interceptor to attach JWT token from localStorage to Authorization header
    - Add response interceptor to handle 401 errors (clear auth and redirect)
    - Export configured axios instance
    - _Requirements: 4.6, 5.5_

- [ ] 11. Implement authentication context
  - [x] 11.1 Create AuthContext provider
    - Implement `frontend/src/context/AuthContext.jsx`
    - Define state: user, token, loading, isAuthenticated
    - Implement `login(email, password)`: call API, store token in localStorage, update state
    - Implement `register(userData)`: call API, handle response
    - Implement `logout()`: clear localStorage, clear state, redirect to login
    - Implement `loadUser()`: load user profile using stored token on mount
    - Use useEffect to call loadUser on component mount
    - Export AuthContext and AuthProvider
    - _Requirements: 2.6, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 11.2 Write property test for token persistence
    - **Property 11: Token persistence**
    - Login, verify token in localStorage, verify token used in requests
    - **Validates: Requirements 2.6, 5.1**

  - [ ]* 11.3 Write property test for session persistence
    - **Property 17: Session persistence across page refresh**
    - Login, simulate refresh, verify auth state restored
    - **Validates: Requirements 5.2**

- [ ] 12. Implement authentication UI components
  - [x] 12.1 Create Login component
    - Implement `frontend/src/components/auth/Login.jsx`
    - Create form with email and password fields
    - Add client-side validation (email format, required fields)
    - Display validation errors inline
    - Call AuthContext.login on form submission
    - Display API error messages
    - Show loading state during API call
    - Add link to registration page
    - _Requirements: 2.1, 10.4, 10.5_

  - [x] 12.2 Create Register component
    - Implement `frontend/src/components/auth/Register.jsx`
    - Create form with name, email, password, and role fields
    - Add client-side validation (email format, password length, required fields)
    - Display validation errors inline
    - Call AuthContext.register on form submission
    - Display API error messages
    - Show loading state during API call
    - Add link to login page
    - Redirect to login on successful registration
    - _Requirements: 1.1, 10.4, 10.5, 10.6_

  - [ ]* 12.3 Write property test for frontend validation
    - **Property 28: Frontend validation**
    - Generate invalid inputs, verify client-side validation catches them
    - **Validates: Requirements 10.4, 10.5, 10.6**

- [ ] 13. Implement protected routes and navigation
  - [x] 13.1 Create PrivateRoute component
    - Implement `frontend/src/components/layout/PrivateRoute.jsx`
    - Access authentication state from AuthContext
    - Show loading spinner while checking auth
    - Redirect to /login if not authenticated
    - Render children if authenticated
    - Optionally check user role for role-based routes
    - _Requirements: 4.5_

  - [x] 13.2 Create Navbar component
    - Implement `frontend/src/components/layout/Navbar.jsx`
    - Display application branding
    - Show navigation links based on auth state
    - Display user name and role when authenticated
    - Add logout button when authenticated
    - Add login/register links when not authenticated
    - Make responsive for mobile, tablet, and desktop
    - _Requirements: 11.1, 11.2, 11.3, 12.5_

  - [ ]* 13.3 Write property test for route guard redirection
    - **Property 16: Frontend route guard redirection**
    - Attempt to access protected route without auth, verify redirect
    - **Validates: Requirements 4.5**

- [ ] 14. Implement dashboard component
  - [x] 14.1 Create Dashboard component
    - Implement `frontend/src/components/dashboard/Dashboard.jsx`
    - Display welcome message with user name
    - Display user email and role
    - Add logout button
    - Add placeholder sections for future CRM features
    - Make responsive for all screen sizes
    - _Requirements: 12.4, 12.5_

  - [ ]* 14.2 Write property test for profile display
    - **Property 31: Profile display in UI**
    - Login, verify profile info displayed in dashboard
    - **Validates: Requirements 12.4, 12.5**

- [ ] 15. Set up routing and main App component
  - [x] 15.1 Configure React Router
    - Implement `frontend/src/App.jsx`
    - Set up BrowserRouter with routes
    - Define public routes: /login, /register
    - Define protected routes: /dashboard (wrapped in PrivateRoute)
    - Add redirect from / to /dashboard if authenticated, else /login
    - Wrap app in AuthProvider
    - _Requirements: 4.5_

  - [x] 15.2 Add global styles
    - Implement `frontend/src/App.css` with responsive styles
    - Add CSS reset and base styles
    - Style forms, buttons, and common elements
    - Add responsive breakpoints for mobile (375px), tablet (768px), desktop (1920px)
    - Ensure clean, professional appearance
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 16. Implement frontend error handling
  - [x] 16.1 Add error display utilities
    - Create toast notification component or use inline error displays
    - Implement error message extraction from API responses
    - Add error clearing on user input
    - _Requirements: 9.5_

  - [ ]* 16.2 Write property test for error display
    - **Property 24: User-friendly error display**
    - Simulate API errors, verify user-friendly messages displayed
    - **Validates: Requirements 9.5**

- [x] 17. Checkpoint - Full-stack integration complete
  - Start backend server
  - Start frontend development server
  - Test complete registration flow in browser
  - Test complete login flow in browser
  - Test protected route access
  - Test logout functionality
  - Verify responsive design on different screen sizes
  - Ensure all tests pass, ask the user if questions arise

- [ ] 18. Write backend unit tests
  - [-]* 18.1 Write User model unit tests
    - Test password hashing on save
    - Test comparePassword method
    - Test email uniqueness constraint
    - Test required field validation
    - _Requirements: 1.3, 2.1, 1.2, 1.7_

  - [ ]* 18.2 Write authentication controller unit tests
    - Test register with valid data returns 201
    - Test register with duplicate email returns 409
    - Test login with valid credentials returns token
    - Test login with invalid credentials returns 401
    - Test profile endpoint returns user data
    - Test profile endpoint requires authentication
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 12.2, 12.3_

  - [ ]* 18.3 Write middleware unit tests
    - Test auth middleware with valid token
    - Test auth middleware with missing token
    - Test auth middleware with invalid token
    - Test role middleware with authorized role
    - Test role middleware with unauthorized role
    - _Requirements: 4.1, 4.3, 3.4, 3.5_

  - [ ]* 18.4 Write validation unit tests
    - Test email format validation
    - Test password length validation
    - Test role enum validation
    - Test required field validation
    - _Requirements: 1.5, 1.6, 3.1, 1.7_

- [ ] 19. Write frontend unit tests
  - [ ]* 19.1 Write Login component tests
    - Test component renders correctly
    - Test form submission calls login function
    - Test validation errors display
    - Test API error messages display
    - _Requirements: 2.1, 10.4_

  - [ ]* 19.2 Write Register component tests
    - Test component renders correctly
    - Test form submission calls register function
    - Test client-side validation
    - Test API error messages display
    - _Requirements: 1.1, 10.4_

  - [ ]* 19.3 Write PrivateRoute component tests
    - Test redirects unauthenticated users to login
    - Test renders children for authenticated users
    - Test loading state display
    - _Requirements: 4.5_

  - [ ]* 19.4 Write Dashboard component tests
    - Test displays user information
    - Test displays user role
    - Test logout button functionality
    - _Requirements: 12.4, 12.5_

  - [ ]* 19.5 Write AuthContext tests
    - Test login updates state and stores token
    - Test logout clears state and localStorage
    - Test loadUser restores auth state
    - _Requirements: 2.6, 5.3, 5.2_

- [ ] 20. Write integration tests
  - [ ]* 20.1 Write end-to-end registration flow test
    - Test complete flow: register → success → redirect to login
    - _Requirements: 1.1_

  - [ ]* 20.2 Write end-to-end login flow test
    - Test complete flow: login → token stored → redirect to dashboard
    - _Requirements: 2.1, 2.6_

  - [ ]* 20.3 Write end-to-end protected route test
    - Test complete flow: login → access protected route → logout → redirect
    - _Requirements: 4.5, 5.4_

  - [ ]* 20.4 Write role-based access test
    - Test Admin can access admin routes
    - Test Sales_Agent cannot access admin routes
    - _Requirements: 3.5_

- [x] 21. Final checkpoint and documentation
  - Run all backend tests and verify they pass
  - Run all frontend tests and verify they pass
  - Test application manually in multiple browsers
  - Test responsive design on actual mobile device
  - Update README with complete setup instructions
  - Document environment variables in .env.example files
  - Add API documentation comments
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional test-related sub-tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: backend foundation → frontend UI → integration → comprehensive testing
- All authentication tokens should be handled securely (HTTPS in production, httpOnly cookies as alternative to localStorage)
- Consider adding refresh token mechanism in future iterations for better security
