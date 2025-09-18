# Edit/Delete PR Feature Design

## Current Limitations
- PRs are static HTML files committed to GitHub
- No user authentication system
- No database to track ownership

## Possible Solutions

### Option 1: Email-Based Management (Simplest)
1. Send unique management link in confirmation email
2. Link contains secure token: `/manage-pr?id=abc123&token=xyz789`
3. Management page allows:
   - Mark as "Updated" (doesn't actually edit)
   - Request removal (admin manually removes)
   - View analytics (if implemented)

### Option 2: Supabase Integration (Recommended)
1. Add Supabase for user accounts
2. Track PR ownership in database
3. Allow real edit/delete through authenticated API
4. Benefits:
   - User dashboard
   - PR history
   - Analytics
   - Credit system for bundles

### Option 3: Quick Fix - Expiry System
1. PRs auto-expire after 90 days
2. Show "This PR has expired" message
3. Customers can republish with updates

## Implementation Priority
For MVP: Skip edit/delete
For v2: Add Supabase with full user system

## Email Configuration Needed Now
Add to Netlify Environment Variables:
- SMTP_HOST=smtp.resend.com
- SMTP_PASS=your_resend_api_key
- SMTP_PORT=587