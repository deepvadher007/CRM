# Production CRM - Testing Guide

## Quick Start

### Local Testing
1. Backend: http://localhost:5000
2. Frontend: http://localhost:3000

### Production URLs
- Backend: [Your Render URL]
- Frontend: [Your Netlify URL]

---

## Test Scenarios

### 1. JWT Token Expiry (7 Days)

**Test Steps**:
1. Login to the application
2. Note the current time
3. Keep browser open for 24 hours
4. Verify you're still logged in
5. Perform actions (create lead, etc.)
6. Should work without re-login

**Expected**: Token valid for 7 days, no frequent logouts

---

### 2. Lead Source Field

**Test Steps**:
1. Click "Add New Lead"
2. Verify "Lead Source" dropdown exists
3. Options should be:
   - Own User (default)
   - Investor
   - Inquiry
   - Other
4. Create a lead with each source
5. Verify "Lead Source" column in table
6. Check existing leads show "Own User"

**Expected**: All lead sources work, existing data preserved

---

### 3. Improved Follow-ups

**Test Steps**:
1. Create leads with follow-up dates:
   - One for yesterday
   - One for today
   - One for tomorrow
2. Set one lead status to "Closed"
3. Check "Pending Follow-ups" section

**Expected**:
- Shows yesterday's lead (overdue)
- Shows today's lead
- Does NOT show tomorrow's lead
- Does NOT show closed lead
- Count is accurate

---

### 4. Duplicate Detection

**Test Steps**:

**Weak Duplicate** (phone only):
1. Create lead: Name="John", Phone="1234567890"
2. Try to create: Name="Jane", Phone="1234567890"
3. Should show yellow warning: "Phone number already exists with different name"
4. Phone field should have red border
5. Can still submit

**Strong Duplicate** (name + phone):
1. Create lead: Name="John", Phone="9876543210"
2. Try to create: Name="John", Phone="9876543210"
3. Should show red warning: "Lead with same name and phone already exists"
4. Phone field should have red border
5. Can still submit

**Expected**: Visual warnings, no blocking

---

### 5. Search Function

**Test Steps**:
1. Create multiple leads with different names/phones
2. Use search box:
   - Search by name (e.g., "John")
   - Search by phone (e.g., "1234")
   - Search partial match (e.g., "Jo")
3. Verify:
   - Results filter correctly
   - First result is highlighted briefly
   - Page scrolls to result
   - Case insensitive

**Expected**: Smooth search with auto-scroll and highlight

---

### 6. Filter System

**Test Steps**:

**Status Filter**:
1. Create leads with different statuses
2. Filter by "CNR"
3. Verify only CNR leads show
4. Try other statuses

**Lead Source Filter**:
1. Create leads with different sources
2. Filter by "Investor"
3. Verify only Investor leads show

**Agent Filter** (Admin only):
1. Login as Admin
2. Verify "Agent" filter appears
3. Select an agent
4. Verify only that agent's leads show

**Combined Filters**:
1. Apply multiple filters together
2. Verify results match all criteria

**Clear Filters**:
1. Apply filters
2. Click "Clear Filters"
3. Verify all filters reset

**Expected**: All filters work independently and combined

---

### 7. Change Password

**Test Steps**:
1. Click "Change Password" button
2. Modal should open
3. Enter:
   - Current password (correct)
   - New password (min 8 chars)
   - Confirm password (matching)
4. Submit
5. Should show success message
6. Logout and login with new password

**Error Cases**:
- Wrong old password → Error
- New password < 8 chars → Error
- Passwords don't match → Error

**Expected**: Password changes successfully, can login with new password

---

### 8. Admin Access Control

**Test as Admin**:
1. Login as Admin
2. Verify you see:
   - All leads from all agents
   - "Added By" column showing agent names
   - Agent filter dropdown
3. Create a lead
4. Verify it shows your name in "Added By"
5. Filter by specific agent
6. Verify only that agent's leads show

**Test as Agent**:
1. Login as Agent
2. Verify you see:
   - Only your own leads
   - NO "Added By" column
   - NO Agent filter
3. Create a lead
4. Verify it appears in your list
5. Try to access another agent's lead (shouldn't see it)

**Expected**: Proper isolation, Admin sees all, Agent sees own

---

### 9. Mobile Responsiveness

**Test on Mobile** (or resize browser to < 768px):

**Forms**:
- Fields stack vertically
- Inputs are thumb-friendly (min 48px height)
- Buttons are full width
- Easy to tap

**Filters**:
- Stack vertically
- Easy to use
- Clear button accessible

**Table**:
- Scrolls horizontally
- Readable text
- Actions accessible

**Modal**:
- Fits screen
- Easy to close
- Form fields usable

**Follow-ups**:
- Cards stack vertically
- All info visible
- Actions accessible

**Expected**: Fully functional on mobile devices

---

### 10. Closed Status

**Test Steps**:
1. Create a lead with follow-up date = today
2. Verify it appears in "Pending Follow-ups"
3. Edit lead, change status to "Closed"
4. Verify it disappears from "Pending Follow-ups"
5. Verify it still appears in main table
6. Filter by status "Closed"
7. Verify only closed leads show

**Expected**: Closed leads excluded from follow-ups but visible in table

---

## Integration Tests

### Complete Workflow Test

1. **Register** new agent account
2. **Login** as agent
3. **Create** 5 leads with different:
   - Statuses
   - Lead sources
   - Follow-up dates (past, today, future)
4. **Search** for specific lead
5. **Filter** by status
6. **Edit** a lead
7. **Delete** a lead
8. **Change password**
9. **Logout**
10. **Login** with new password
11. **Verify** all data persists

### Admin Workflow Test

1. **Login** as Admin
2. **View** all leads from all agents
3. **Filter** by specific agent
4. **Create** lead
5. **Verify** "Added By" shows your name
6. **Edit** another agent's lead (should work)
7. **Delete** another agent's lead (should work)
8. **Get agents** list for filter

---

## Performance Tests

### Load Test
1. Create 100+ leads
2. Verify:
   - Table loads quickly
   - Search is responsive
   - Filters work smoothly
   - No lag in UI

### Token Persistence
1. Login
2. Close browser
3. Reopen browser
4. Verify still logged in
5. Perform actions
6. Should work without re-login

---

## Error Handling Tests

### Network Errors
1. Disconnect internet
2. Try to create lead
3. Should show error message
4. Reconnect internet
5. Retry - should work

### Invalid Data
1. Try to create lead without name
2. Should show validation error
3. Try to create lead without phone
4. Should show validation error

### Unauthorized Access
1. Logout
2. Try to access /api/leads directly
3. Should return 401 Unauthorized

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Production Checklist

Before deploying to production:

### Backend
- [ ] Environment variables set correctly
- [ ] MongoDB Atlas connection working
- [ ] JWT_SECRET is secure (32+ characters)
- [ ] CORS configured for frontend URL
- [ ] All endpoints tested

### Frontend
- [ ] API URL points to production backend
- [ ] `_redirects` file in public folder
- [ ] Build completes without errors
- [ ] No console errors in production

### Database
- [ ] Backup created
- [ ] Indexes created
- [ ] Connection string secure

### Security
- [ ] JWT secret is strong
- [ ] Passwords hashed with bcrypt
- [ ] Input validation working
- [ ] SQL injection protection active
- [ ] XSS protection active

---

## Known Issues

### Warnings (Non-Critical)
- Mongoose duplicate index warning (cosmetic, doesn't affect functionality)
- React exhaustive-deps warnings (suppressed with eslint-disable)

### Limitations
- Duplicate detection is warning-only (by design)
- Search is case-insensitive (by design)
- Token expiry is 7 days (by design)

---

## Troubleshooting

### Issue: Can't login
**Solution**: Check JWT_SECRET in backend .env

### Issue: Leads not showing
**Solution**: Check MongoDB connection, verify user role

### Issue: Filters not working
**Solution**: Clear browser cache, check network tab

### Issue: Duplicate warning not showing
**Solution**: Verify phone number format, check backend logs

### Issue: Follow-ups not showing
**Solution**: Verify follow-up date is <= today, status != Closed

---

## Support Contacts

- Backend Issues: Check Render logs
- Frontend Issues: Check Netlify logs
- Database Issues: Check MongoDB Atlas
- General: Review PRODUCTION_UPDATES_SUMMARY.md

---

**Last Updated**: 2024
**Version**: 2.0 (Production Updates)
