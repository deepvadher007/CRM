# Hanuvansh CRM

A full-stack MERN (MongoDB, Express, React, Node.js) Customer Relationship Management system with JWT authentication, role-based access control, and PDF management.

## Features

- 🔐 JWT-based authentication (3-hour sessions)
- 👥 Role-based access control (Admin & Agent)
- 📱 Lead management with status tracking
- 📎 PDF upload and WhatsApp sharing
- 🔍 Advanced search and filtering
- 📅 Follow-up date management
- 🔒 Secure password change

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd hanuvansh-crm
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/hanuvanshCRM
JWT_SECRET=your-secure-32-character-secret-key
JWT_EXPIRE=3h
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000
```

4. **Start the application**
```bash
npm run dev
```

5. **Open browser**
```
http://localhost:3000
```

## Available Scripts

```bash
npm run dev          # Start both backend and frontend
npm run backend      # Start only backend
npm run frontend     # Start only frontend
npm run install-all  # Install all dependencies
```

## Tech Stack

**Backend:**
- Node.js & Express.js
- MongoDB with Mongoose
- JWT authentication
- Multer (file uploads)

**Frontend:**
- React 18
- React Router v6
- Axios
- Context API

## Project Structure

```
hanuvansh-crm/
├── backend/          # Node.js backend
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── server.js
│   └── package.json
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
└── package.json      # Root package
```

## User Roles

**Admin:**
- View all leads
- Create, edit, delete any lead
- Upload PDFs for any lead
- Filter leads by agent

**Agent:**
- View only own leads
- Create, edit, delete own leads
- Upload PDFs for own leads

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get profile
- `PUT /api/auth/change-password` - Change password
- `GET /api/auth/agents` - Get all agents (Admin)

### Leads
- `GET /api/leads` - Get leads (with filters)
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `GET /api/leads/today` - Get today's follow-ups
- `POST /api/leads/:id/upload-pdf` - Upload PDF

## Production Deployment

### Backend (Render)
1. Set environment variables in Render dashboard
2. Deploy from GitHub repository

### Frontend (Netlify)
1. Build: `cd frontend && npm run build`
2. Deploy `build` folder
3. Set `REACT_APP_API_URL` environment variable

## License

ISC

## Author

Hanuvansh Estate Consultant
