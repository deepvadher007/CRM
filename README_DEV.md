# Hanuvansh CRM - Local Development Guide

## Prerequisites

1. **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** - Choose ONE option:
   - **Option A:** Install MongoDB locally - [Download](https://www.mongodb.com/try/download/community)
   - **Option B:** Use MongoDB Atlas (cloud) - [Sign up free](https://www.mongodb.com/cloud/atlas)

## Quick Start

### Step 1: Install Dependencies

```bash
npm install
```

This will install `concurrently` in the root directory.

### Step 2: Configure Environment Variables

#### Backend Configuration

Create or edit `backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
# OPTION 1: Local MongoDB (requires MongoDB installed locally)
MONGODB_URI=mongodb://127.0.0.1:27017/hanuvanshCRM

# OPTION 2: MongoDB Atlas (cloud - no local installation needed)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hanuvanshCRM

# JWT Configuration
JWT_SECRET=hanuvansh_crm_jwt_secret_key_2024_minimum_32_characters_for_security
JWT_EXPIRE=3h

# Client URL for CORS
CLIENT_URL=http://localhost:3000
```

**Important:** 
- If you don't have MongoDB installed locally, use MongoDB Atlas (Option 2)
- The system will automatically fallback to `mongodb://127.0.0.1:27017/hanuvanshCRM` if `MONGODB_URI` is not set

#### Frontend Configuration

Create or edit `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

### Step 3: Start the Application

**Option A: Start Both Servers (Recommended)**

```bash
npm run dev
```

This will start:
- Backend on `http://localhost:5000`
- Frontend on `http://localhost:3000`

**Option B: Start Servers Separately**

Terminal 1 (Backend):
```bash
npm run backend
```

Terminal 2 (Frontend):
```bash
npm run frontend
```

### Step 4: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Troubleshooting

### Issue: PowerShell Script Execution Error

**Error:** `running scripts is disabled on this system`

**Solution:** Use Command Prompt (cmd) instead of PowerShell:
1. Open Command Prompt
2. Navigate to project directory
3. Run `npm run dev`

**Alternative:** Enable PowerShell scripts (Run as Administrator):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: MongoDB Connection Failed

**Error:** `MongoDB connection attempt failed`

**Solutions:**

1. **If using local MongoDB:**
   - Ensure MongoDB is installed
   - Start MongoDB service:
     - Windows: `net start MongoDB`
     - Mac: `brew services start mongodb-community`
     - Linux: `sudo systemctl start mongod`

2. **If using MongoDB Atlas:**
   - Check your internet connection
   - Verify credentials in `backend/.env`
   - Ensure your IP is whitelisted in Atlas dashboard

3. **Fallback:** The system will automatically use `mongodb://127.0.0.1:27017/hanuvanshCRM` if `MONGODB_URI` is not defined

### Issue: Port Already in Use

**Error:** `Port 5000 is already in use`

**Solution:** 
- Stop other applications using port 5000
- Or change `PORT` in `backend/.env`

### Issue: Module Not Found

**Error:** `Cannot find module`

**Solution:**
```bash
npm run install-all
```

## Available Scripts

```bash
npm run dev          # Start both backend and frontend
npm run backend      # Start only backend
npm run frontend     # Start only frontend
npm run install-all  # Install all dependencies (root, backend, frontend)
```

## Project Structure

```
hanuvansh-crm/
├── backend/
│   ├── src/
│   │   ├── config/       # Database & configuration
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # Auth & error handling
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API routes
│   │   └── server.js     # Entry point
│   ├── uploads/          # PDF storage
│   ├── .env              # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── context/      # Context providers
│   │   ├── services/     # API services
│   │   └── App.jsx       # Main component
│   ├── .env              # Environment variables
│   └── package.json
│
├── package.json          # Root package (concurrently)
├── README.md             # Main documentation
└── README_DEV.md         # This file
```

## Development Workflow

1. **Make changes** to backend or frontend code
2. **Servers auto-reload** (backend with nodemon, frontend with react-scripts)
3. **Test changes** in browser at `http://localhost:3000`
4. **Check console** for errors (both terminal and browser)

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Production Deployment

This local setup does NOT affect production deployment:
- Production uses environment variables set in Render/Netlify
- Production MongoDB URI remains unchanged
- Local `.env` files are gitignored

## Need Help?

1. Check this guide
2. Check browser console (F12)
3. Check terminal output
4. Verify environment variables
5. Ensure MongoDB is running

## Success Checklist

After running `npm run dev`, verify:
- [ ] Backend shows "Server running on port 5000"
- [ ] Backend shows "MongoDB Connected"
- [ ] Frontend shows "Compiled successfully!"
- [ ] Browser opens to `http://localhost:3000`
- [ ] Login page appears
- [ ] No console errors

---

**Happy Coding! 🚀**
