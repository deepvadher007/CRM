# Hanuvansh Estate Consultant CRM - Authentication System

A secure, full-stack MERN (MongoDB, Express, React, Node.js) authentication system with JWT-based authentication and role-based access control.

## Features

- User registration and login
- JWT-based authentication
- Role-based access control (Admin and Sales Agent)
- Password hashing with bcrypt
- Protected routes
- Responsive UI design
- Input validation and sanitization
- Comprehensive error handling

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB & Mongoose
- JWT (jsonwebtoken)
- bcryptjs for password hashing
- express-validator for input validation
- dotenv for environment configuration
- cors for cross-origin requests

### Frontend
- React 18+
- React Router v6
- Axios for HTTP requests
- Context API for state management
- CSS3 for styling

## Project Structure

```
hanuvansh-crm-auth/
├── backend/              # Backend API
│   ├── src/
│   │   ├── config/      # Database and environment configuration
│   │   ├── controllers/ # Business logic
│   │   ├── middleware/  # Authentication and validation middleware
│   │   ├── models/      # Mongoose models
│   │   ├── routes/      # API routes
│   │   └── utils/       # Utility functions
│   ├── .env.example     # Environment variables template
│   └── package.json
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # Context providers
│   │   ├── services/    # API client
│   │   └── utils/       # Utility functions
│   └── package.json
│
└── README.md
```

## Setup Instructions

### Prerequisites

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional, for cloning the repository)

### Quick Start

For a quick setup, follow these steps:

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd hanuvansh-crm-auth
   ```

2. **Start MongoDB**
   - If using local MongoDB: `mongod`
   - If using MongoDB Atlas: Get your connection string from the Atlas dashboard

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env file with your configuration
   npm run dev
   ```

4. **Setup Frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env file with backend URL
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Detailed Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   # On Linux/Mac
   cp .env.example .env
   
   # On Windows
   copy .env.example .env
   ```

4. **Configure environment variables** (edit `.env` file):
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/hanuvansh-crm
   JWT_SECRET=your_very_secure_secret_key_at_least_32_characters_long
   JWT_EXPIRE=15m
   ```

   **Important Notes:**
   - `MONGODB_URI`: Use your MongoDB connection string. For MongoDB Atlas, it looks like: `mongodb+srv://username:password@cluster.mongodb.net/hanuvansh-crm`
   - `JWT_SECRET`: Generate a secure random string (minimum 32 characters). You can use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `JWT_EXPIRE`: Token expiration time (e.g., 15m, 1h, 7d)

5. **Start the server:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Verify backend is running:**
   - The console should show: "Server running on port 5000" and "MongoDB connected successfully"
   - Test the API: `curl http://localhost:5000/api/auth/profile` (should return 401 Unauthorized)

### Detailed Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   # On Linux/Mac
   cp .env.example .env
   
   # On Windows
   copy .env.example .env
   ```

4. **Configure environment variables** (edit `.env` file):
   ```env
   REACT_APP_API_URL=http://localhost:5000
   ```

   **Note:** If deploying to production, update this to your production backend URL.

5. **Start the development server:**
   ```bash
   npm start
   ```

6. **Access the application:**
   - The browser should automatically open to http://localhost:3000
   - You should see the login page

### First Time Usage

1. **Register a new user:**
   - Click "Register" on the login page
   - Fill in the registration form:
     - Name: Your full name
     - Email: Valid email address
     - Password: At least 8 characters
     - Role: Select either "Admin" or "Sales_Agent"
   - Click "Register"

2. **Login:**
   - Use your registered email and password
   - Click "Login"
   - You'll be redirected to the dashboard

3. **Test the application:**
   - View your profile information on the dashboard
   - Try logging out and logging back in
   - Test the responsive design by resizing your browser

## API Endpoints

### Authentication Routes

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/profile` - Get authenticated user profile (protected)

## Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment mode | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/hanuvansh-crm |
| JWT_SECRET | Secret key for JWT signing | your_secret_key_here |
| JWT_EXPIRE | JWT token expiration time | 15m |

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| REACT_APP_API_URL | Backend API URL | http://localhost:5000 |

## Testing

### Backend Tests

Run backend tests with coverage:
```bash
cd backend
npm test
```

The backend has comprehensive test coverage (98%+) including:
- Unit tests for all controllers, middleware, and models
- Integration tests for API routes
- Validation and error handling tests

### Frontend Tests

Run frontend tests:
```bash
cd frontend
npm test
```

Run tests in CI mode with coverage:
```bash
cd frontend
CI=true npm test -- --coverage
```

## Troubleshooting

### Backend Issues

**MongoDB Connection Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
- **Solution**: Ensure MongoDB is running. Start it with `mongod` or check your MongoDB Atlas connection string.

**JWT_SECRET Missing:**
```
Error: JWT_SECRET is required
```
- **Solution**: Make sure you have a `.env` file in the backend directory with `JWT_SECRET` defined.

**Port Already in Use:**
```
Error: listen EADDRINUSE: address already in use :::5000
```
- **Solution**: Either stop the process using port 5000 or change the `PORT` in your `.env` file.

### Frontend Issues

**Cannot Connect to Backend:**
```
Network Error / ERR_CONNECTION_REFUSED
```
- **Solution**: Ensure the backend server is running on the correct port. Check `REACT_APP_API_URL` in frontend `.env` file.

**Module Not Found:**
```
Cannot find module 'react-router-dom'
```
- **Solution**: Run `npm install` in the frontend directory to install all dependencies.

**CORS Errors:**
```
Access to XMLHttpRequest blocked by CORS policy
```
- **Solution**: The backend has CORS enabled. Ensure your frontend URL is correct and the backend is running.

### General Issues

**Environment Variables Not Loading:**
- Make sure `.env` files are in the correct directories (backend/.env and frontend/.env)
- Restart the servers after changing environment variables
- Frontend environment variables must start with `REACT_APP_`

**Tests Failing:**
- Ensure all dependencies are installed: `npm install`
- Clear Jest cache: `npm test -- --clearCache`
- Check that MongoDB Memory Server can start (for backend tests)

## User Roles

- **Admin**: Full administrative access
- **Sales_Agent**: Sales-related access

## Security Features

- Password hashing using bcrypt (10 salt rounds)
- JWT-based stateless authentication
- Input validation and sanitization
- Protected routes with authentication middleware
- Role-based authorization
- CORS configuration
- Environment-based configuration

## Development

### Backend Development

The backend uses nodemon for hot-reloading during development. Any changes to the source files will automatically restart the server.

### Frontend Development

The frontend uses React's built-in development server with hot module replacement.

## Future Enhancements

- Refresh token mechanism
- Password reset functionality
- Email verification
- Two-factor authentication
- User profile management
- CRM-specific features (leads, contacts, deals)

## License

ISC

## Author

Hanuvansh Estate Consultant
