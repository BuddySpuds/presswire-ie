# Quality Assurance & Testing Guide for PressWire.ie

## 🎯 Testing Objectives

Ensure the complete flow works end-to-end:
1. **Email Verification** - Resend integration sends verification codes
2. **Payment Processing** - Stripe webhooks trigger correctly
3. **PR Generation** - Press releases are created and saved
4. **PR Publication** - PRs appear at /news/ URLs

## 🧪 Quick Test Commands

### 1. Test Email Verification (with real .ie email)
```bash
node test-email-verification.js youremail@yourdomain.ie
```

### 2. Run End-to-End Test
```bash
npm install playwright  # If not installed
node test-e2e-playwright.js
```

### 3. Test Webhook Locally
```bash
curl -X POST https://presswire.ie/.netlify/functions/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"type":"checkout.session.completed","data":{"object":{"id":"cs_test_123"}}}'
```

## ✅ Manual Testing Checklist

### Phase 1: Email Verification
- [ ] Visit https://presswire.ie/generate.html
- [ ] Enter a real .ie domain email
- [ ] Verify email passes validation
- [ ] Check Resend dashboard for sent email
- [ ] Confirm verification code received
- [ ] Enter code and verify it works

### Phase 2: PR Submission
- [ ] Fill company details (use real CRO number)
- [ ] Complete PR form with all fields
- [ ] Add SEO keywords
- [ ] Add website and social links
- [ ] Preview shows all data correctly
- [ ] Data persists in localStorage

### Phase 3: Payment Flow
- [ ] Select €1 test package
- [ ] Redirects to Stripe checkout
- [ ] Use test card: 4242 4242 4242 4242
- [ ] Payment completes successfully
- [ ] Redirects back to success page
- [ ] Success page shows correct payment ID

### Phase 4: PR Generation
- [ ] Success page shows "Generating PR" message
- [ ] PR link appears within 60 seconds
- [ ] PR link is clickable and works
- [ ] PR content displays correctly
- [ ] All fields from form appear in PR
- [ ] SEO meta tags are present

### Phase 5: Webhook Verification
- [ ] Check Stripe Dashboard → Webhooks
- [ ] Event shows as delivered (not failed)
- [ ] Response code is 200
- [ ] Check Netlify Functions log for success

### Phase 6: Email Confirmation
- [ ] Confirmation email sent to customer
- [ ] Email contains PR link
- [ ] Link in email works correctly
- [ ] Check Resend dashboard for delivery

## 🔍 Debugging Steps

### If Webhook Fails:

1. **Check Stripe Dashboard**
   - Go to Developers → Webhooks
   - Click on your endpoint
   - View recent events
   - Check "Response" tab for errors

2. **Verify Environment Variables in Netlify**
   ```
   STRIPE_WEBHOOK_SECRET_TEST=whsec_...  (for test mode)
   STRIPE_WEBHOOK_SECRET=whsec_...       (for live mode)
   STRIPE_SECRET_KEY=sk_test_...
   ```

3. **Check Function Logs**
   - In Netlify Dashboard → Functions
   - Click on stripe-webhook
   - View recent invocations
   - Check for error messages

### If PR Doesn't Generate:

1. **Check Browser Console**
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check localStorage has PR data

2. **Verify GitHub Token**
   ```
   GITHUB_TOKEN=ghp_...
   GITHUB_OWNER=BuddySpuds
   GITHUB_REPO=presswire-ie
   ```

3. **Test Save PR Endpoint**
   ```bash
   curl -X POST https://presswire.ie/api/save-pr \
     -H "Content-Type: application/json" \
     -d '{"content":"<html>Test</html>","filename":"test.html"}'
   ```

### If Email Doesn't Send:

1. **Check Resend Configuration**
   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASS=re_...
   ```

2. **Verify DNS Records**
   - Check Resend dashboard for domain verification
   - All records should show green checkmarks

3. **Test Email Endpoint Directly**
   ```bash
   curl -X POST https://presswire.ie/api/send-email \
     -H "Content-Type: application/json" \
     -d '{"action":"test","email":"your@email.ie"}'
   ```

## 📊 Expected Results

### Successful Flow:
1. Form submission → localStorage saves data
2. Payment → Stripe processes → Redirects to success
3. Success page → Retrieves localStorage → Generates PR
4. Webhook fires → Backup PR generation
5. Email sent → Contains PR link
6. PR accessible at /news/[filename].html

### Key Metrics:
- Email delivery: < 5 seconds
- Payment processing: < 10 seconds
- PR generation: < 60 seconds
- Webhook response: < 3 seconds
- Page load time: < 2 seconds

## 🚨 Common Issues & Solutions

### Issue: "Webhook Error: No signatures found matching the expected signature"
**Solution:** Webhook secret mismatch. Ensure STRIPE_WEBHOOK_SECRET_TEST matches Stripe Dashboard

### Issue: "PR not appearing after payment"
**Solution:**
1. Check webhook is firing (Stripe Dashboard)
2. Verify localStorage has data
3. Check browser console for errors
4. Ensure GitHub token is valid

### Issue: "Email not received"
**Solution:**
1. Check spam folder
2. Verify domain DNS records
3. Check Resend dashboard for bounces
4. Test with different email provider

### Issue: "CRO lookup failing"
**Solution:** CORS issue with CRO API - this is expected and doesn't block flow

## 🎯 Quality Assurance Standards

### Every PR Must Have:
- [ ] Valid HTML structure
- [ ] Company name and CRO number
- [ ] Contact information
- [ ] SEO meta tags
- [ ] Dofollow backlinks (where provided)
- [ ] Mobile-responsive design
- [ ] Fast load time (< 2s)

### Security Checks:
- [ ] No exposed API keys in code
- [ ] No sensitive data in localStorage
- [ ] XSS protection on all inputs
- [ ] HTTPS only for production
- [ ] Rate limiting on APIs

## 📱 Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iPhone)
- [ ] Chrome Mobile (Android)

## 🚀 Production Readiness

Before going live:
- [ ] All environment variables set
- [ ] Stripe in LIVE mode
- [ ] Real payment links configured
- [ ] Email domain verified
- [ ] GitHub token active
- [ ] DNS records confirmed
- [ ] SSL certificate valid
- [ ] Error monitoring enabled

## 📞 Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Resend Support**: https://resend.com/support
- **Netlify Support**: https://www.netlify.com/support
- **Developer**: Robert Porter

---

*Last Updated: September 2025*
*Version: 1.0*