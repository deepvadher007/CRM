# Hanuvansh CRM - API Documentation

## Base URL

```
Development: http://localhost:5000
Production: https://your-domain.com
```

## Authentication

Most endpoints require authentication using JWT (JSON Web Token). Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error 1", "Detailed error 2"],
  "statusCode": 400
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required or failed |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error - Server error |

---

## Endpoints

### 1. Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Access:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "Admin"
}
```

**Request Body Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| name | string | Yes | User's full name | Min 2 characters |
| email | string | Yes | User's email address | Valid email format, unique |
| password | string | Yes | User's password | Min 8 characters |
| role | string | Yes | User's role | Must be 'Admin' or 'Sales_Agent' |

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Admin",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Name must be at least 2 characters long",
    "Password must be at least 8 characters long"
  ],
  "statusCode": 400
}
```

**409 - Email Already Exists:**
```json
{
  "success": false,
  "message": "User with this email already exists",
  "statusCode": 409
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "role": "Admin"
  }'
```

---

### 2. Login User

Authenticate a user and receive a JWT token.

**Endpoint:** `POST /api/auth/login`

**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Request Body Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |
| password | string | Yes | User's password |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiQWRtaW4iLCJpYXQiOjE3MDUzMTgyMDAsImV4cCI6MTcwNTMxOTEwMH0.signature",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Admin"
  }
}
```

**Token Payload:**
The JWT token contains the following claims:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "role": "Admin",
  "iat": 1705318200,
  "exp": 1705319100
}
```

**Error Responses:**

**400 - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Password is required"
  ],
  "statusCode": 400
}
```

**401 - Invalid Credentials:**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "statusCode": 401
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Token Expiration:**
- Access tokens expire after 15 minutes (configurable via JWT_EXPIRE environment variable)
- After expiration, users must log in again to obtain a new token

---

### 3. Get User Profile

Retrieve the authenticated user's profile information.

**Endpoint:** `GET /api/auth/profile`

**Access:** Private (requires authentication)

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Admin",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

**401 - No Token Provided:**
```json
{
  "success": false,
  "message": "No token provided",
  "statusCode": 401
}
```

**401 - Invalid Token:**
```json
{
  "success": false,
  "message": "Invalid token",
  "statusCode": 401
}
```

**401 - Token Expired:**
```json
{
  "success": false,
  "message": "Token expired",
  "statusCode": 401
}
```

**404 - User Not Found:**
```json
{
  "success": false,
  "message": "User not found",
  "statusCode": 404
}
```

**Example cURL:**
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Security Considerations

### Password Security
- Passwords are hashed using bcrypt with 10 salt rounds
- Passwords are never returned in API responses
- Minimum password length: 8 characters

### JWT Token Security
- Tokens are signed using HS256 algorithm
- Token secret should be at least 32 characters long
- Tokens expire after 15 minutes (configurable)
- Tokens should be stored securely on the client (e.g., httpOnly cookies or secure localStorage)

### Input Validation
- All inputs are validated using express-validator
- Inputs are sanitized to prevent XSS attacks
- SQL injection patterns are detected and rejected

### CORS
- CORS is enabled for cross-origin requests
- Configure allowed origins in production

---

## Rate Limiting

(Optional - to be implemented)

To prevent abuse, consider implementing rate limiting:
- Maximum 100 requests per 15 minutes per IP address
- Stricter limits for authentication endpoints (e.g., 5 login attempts per 15 minutes)

---

## Error Handling

All errors follow a consistent format and include:
- `success`: Always `false` for errors
- `message`: Human-readable error description
- `errors`: Array of detailed error messages (for validation errors)
- `statusCode`: HTTP status code

### Common Error Scenarios

1. **Validation Errors (400)**
   - Missing required fields
   - Invalid data format
   - Data doesn't meet validation rules

2. **Authentication Errors (401)**
   - Missing or invalid JWT token
   - Expired JWT token
   - Invalid credentials

3. **Authorization Errors (403)**
   - Insufficient permissions for the requested resource

4. **Resource Errors (404)**
   - Requested resource not found

5. **Conflict Errors (409)**
   - Duplicate email during registration
   - Unique constraint violations

6. **Server Errors (500)**
   - Database connection failures
   - Unexpected server errors

---

## Testing the API

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","role":"Admin"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Get Profile:**
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. Import the endpoints into Postman
2. Set the base URL as an environment variable
3. For protected routes, add the token to the Authorization header (Type: Bearer Token)

### Using JavaScript (Axios)

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:5000';

// Register
const register = async (userData) => {
  const response = await axios.post(`${API_URL}/api/auth/register`, userData);
  return response.data;
};

// Login
const login = async (credentials) => {
  const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
  return response.data;
};

// Get Profile
const getProfile = async (token) => {
  const response = await axios.get(`${API_URL}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
```

---

## Changelog

### Version 1.0.0 (Current)
- Initial release
- User registration endpoint
- User login endpoint with JWT authentication
- User profile retrieval endpoint
- Role-based access control (Admin, Sales_Agent)
- Input validation and sanitization
- Comprehensive error handling

---

## Support

For issues or questions, please contact the development team or refer to the main README.md file.
