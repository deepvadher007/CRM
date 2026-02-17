# Production Deployment Instructions

## Pre-Deployment Checklist

### 1. Code Review
- [ ] All changes tested locally
- [ ] No console.log statements in production code
- [ ] No hardcoded credentials
- [ ] Error handling in place
- [ ] Mobile responsive verified

### 2. Environment Variables
- [ ] Backend .env configured
- [ ] Frontend .env configured
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] MongoDB Atlas connection string correct
- [ ] CORS origins set correctly

### 3. Database
- [ ] Backup created
- [ ] Connection tested
- [ ] Indexes verified

---

## Backend Deployment (Render)

### Step 1: Prepare Repository
```bash
# Commit all changes
git add .
git commit -m "Production updates: JWT 7d, filters, search, duplicate detection, change password"
git push origin main
```

### Step 2: Render Configuration

1. **Login to Render Dashboard**
   - Go to https://render.com
   - Navigate to your backend service

2. **Verify Environment Variables**
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<your-mongodb-atlas-connection-string>
   JWT_SECRET=<your-strong-secret-key>
   FRONTEND_URL=<your-netlify-url>
   ```

3. **Deploy**
   - Render will auto-deploy on git push
   - Or click "Manual Deploy" → "Deploy latest commit"

4. **Monitor Deployment**
   - Watch logs for errors
   - Verify "Server running" message
   - Check MongoDB connection

### Step 3: Verify Backend

Test endpoints:
```bash
# Health check
curl https://your-backend.onrender.com/

# Login test
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","password":"password123"}'

# Get leads (with token)
curl https://your-backend.onrender.com/api/leads \
  -H "Authorization: Bearer <your-token>"
```

---

## Frontend Deployment (Netlify)

### Step 1: Prepare Repository
```bash
# Ensure _redirects file exists
cat frontend/public/_redirects
# Should contain: /*    /index.html   200

# Commit if needed
git add frontend/public/_redirects
git commit -m "Add redirects for SPA routing"
git push origin main
```

### Step 2: Netlify Configuration

1. **Login to Netlify Dashboard**
   - Go to https://netlify.com
   - Navigate to your site

2. **Verify Build Settings**
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/build
   ```

3. **Environment Variables**
   ```
   REACT_APP_API_URL=<your-render-backend-url>
   ```

4. **Deploy**
   - Netlify will auto-deploy on git push
   - Or click "Trigger deploy" → "Deploy site"

5. **Monitor Deployment**
   - Watch build logs
   - Verify successful build
   - Check for errors

### Step 3: Verify Frontend

1. **Open Site**
   - Visit your Netlify URL
   - Should load without errors

2. **Test Features**
   - Login
   - Create lead
   - Search
   - Filter
   - Change password

3. **Check Console**
   - Open browser DevTools
   - No errors in console
   - API calls successful

---

## Post-Deployment Verification

### 1. Authentication
- [ ] Login works
- [ ] Token persists (7 days)
- [ ] Logout works
- [ ] Change password works

### 2. Lead Management
- [ ] Create lead
- [ ] Edit lead
- [ ] Delete lead
- [ ] Lead source dropdown works
- [ ] Duplicate detection shows warnings

### 3. Follow-ups
- [ ] Pending follow-ups show correctly
- [ ] Overdue leads included
- [ ] Closed leads excluded
- [ ] Count is accurate

### 4. Filters & Search
- [ ] Search by name works
- [ ] Search by phone works
- [ ] Status filter works
- [ ] Lead source filter works
- [ ] Agent filter works (Admin)
- [ ] Clear filters works

### 5. Access Control
- [ ] Admin sees all leads
- [ ] Admin sees "Added By" column
- [ ] Agent sees only own leads
- [ ] Agent doesn't see "Added By" column

### 6. Mobile
- [ ] Responsive on mobile
- [ ] All features work
- [ ] No layout issues

---

## Rollback Plan

### If Issues Occur

**Backend Rollback**:
1. Go to Render dashboard
2. Click "Manual Deploy"
3. Select previous successful deployment
4. Click "Deploy"

**Frontend Rollback**:
1. Go to Netlify dashboard
2. Click "Deploys"
3. Find previous successful deploy
4. Click "Publish deploy"

**Database Rollback**:
1. Restore from backup
2. Use MongoDB Atlas backup feature
3. Select restore point before deployment

---

## Monitoring

### Backend Monitoring (Render)

1. **Logs**
   - Check Render logs regularly
   - Look for errors
   - Monitor response times

2. **Metrics**
   - CPU usage
   - Memory usage
   - Request count

3. **Alerts**
   - Set up email alerts for errors
   - Monitor uptime

### Frontend Monitoring (Netlify)

1. **Analytics**
   - Page views
   - Load times
   - Error rates

2. **Logs**
   - Build logs
   - Function logs (if using)

3. **Alerts**
   - Failed builds
   - High error rates

### Database Monitoring (MongoDB Atlas)

1. **Performance**
   - Query performance
   - Connection count
   - Storage usage

2. **Alerts**
   - High CPU
   - Low storage
   - Connection issues

---

## Common Issues & Solutions

### Issue: CORS Error
**Symptom**: Frontend can't connect to backend
**Solution**:
1. Check FRONTEND_URL in backend .env
2. Verify CORS configuration in server.js
3. Ensure URL includes protocol (https://)

### Issue: 404 on Refresh
**Symptom**: Page not found when refreshing
**Solution**:
1. Verify `_redirects` file exists in `frontend/public/`
2. Content should be: `/*    /index.html   200`
3. Redeploy frontend

### Issue: Token Expired Immediately
**Symptom**: Logout right after login
**Solution**:
1. Check JWT_SECRET is set in backend
2. Verify token expiry is "7d" in authController.js
3. Clear browser localStorage
4. Try again

### Issue: Duplicate Detection Not Working
**Symptom**: No warning on duplicate phone
**Solution**:
1. Check backend logs for errors
2. Verify Lead model has phone field
3. Test API endpoint directly
4. Check frontend console for errors

### Issue: Filters Not Working
**Symptom**: Filters don't change results
**Solution**:
1. Check network tab for API calls
2. Verify query params in URL
3. Check backend getAllLeads function
4. Clear browser cache

### Issue: Follow-ups Not Showing
**Symptom**: No pending follow-ups displayed
**Solution**:
1. Verify follow-up dates are <= today
2. Check lead status is not "Closed"
3. Test API endpoint: GET /api/leads/today
4. Check backend getTodayFollowUps function

---

## Performance Optimization

### Backend
- [ ] Enable compression
- [ ] Add rate limiting
- [ ] Optimize database queries
- [ ] Add caching if needed

### Frontend
- [ ] Minimize bundle size
- [ ] Lazy load components
- [ ] Optimize images
- [ ] Enable CDN

### Database
- [ ] Create indexes
- [ ] Optimize queries
- [ ] Monitor slow queries
- [ ] Scale if needed

---

## Security Checklist

### Backend
- [ ] JWT_SECRET is strong and unique
- [ ] Passwords hashed with bcrypt
- [ ] Input validation on all endpoints
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] HTTPS only

### Frontend
- [ ] No sensitive data in code
- [ ] API keys in environment variables
- [ ] HTTPS only
- [ ] Content Security Policy
- [ ] No console.log in production

### Database
- [ ] Strong password
- [ ] IP whitelist configured
- [ ] Backup enabled
- [ ] Encryption at rest
- [ ] Encryption in transit

---

## Maintenance

### Daily
- [ ] Check error logs
- [ ] Monitor uptime
- [ ] Review user feedback

### Weekly
- [ ] Review performance metrics
- [ ] Check database size
- [ ] Update dependencies if needed

### Monthly
- [ ] Full backup
- [ ] Security audit
- [ ] Performance review
- [ ] User feedback analysis

---

## Support

### Documentation
- `PRODUCTION_UPDATES_SUMMARY.md` - Feature details
- `TESTING_GUIDE.md` - Testing procedures
- `README.md` - General information

### Logs
- Render: https://dashboard.render.com
- Netlify: https://app.netlify.com
- MongoDB: https://cloud.mongodb.com

### Emergency Contacts
- Backend Issues: Check Render support
- Frontend Issues: Check Netlify support
- Database Issues: Check MongoDB Atlas support

---

## Success Criteria

Deployment is successful when:
- [ ] All endpoints respond correctly
- [ ] Frontend loads without errors
- [ ] Users can login and perform actions
- [ ] All new features work as expected
- [ ] No critical errors in logs
- [ ] Performance is acceptable
- [ ] Mobile experience is good

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Version**: 2.0 (Production Updates)
**Status**: ☐ Pending  ☐ In Progress  ☐ Complete  ☐ Rolled Back

---

## Notes

_Add any deployment-specific notes here_

---

**Last Updated**: 2024
