# PressWire.ie Production Testing Guide

## 🚀 System Status: READY FOR PRODUCTION

### ✅ Confirmed Working:
- Email verification system (DNS records verified in Resend)
- Domain validation (blocks free email providers)
- [skip ci] build protection (preserving 1,000 credits/month)
- API endpoints responding correctly
- Static site serving properly

## 📋 Complete Test Flow

### Step 1: Email Verification Test
```bash
# Test with a real .ie domain email
curl -X POST https://presswire.ie/api/verify-domain \
  -H "Content-Type: application/json" \
  -d '{"action":"send-code","email":"your-email@company.ie"}'

# Should return:
# {"success":true,"message":"Verification code sent",...}
# NO demoCode should appear (that means real email was sent)
```

### Step 2: Manual Browser Test
1. Go to https://presswire.ie/generate.html
2. Enter company details:
   - Company Name: Your Company Ltd
   - CRO Number: Any valid number (e.g., 669894)
   - Email: your-email@company.ie
3. Click "Send Verification Code"
4. Check email for 6-digit code
5. Enter code and proceed to Step 2

### Step 3: Payment Test (Use Test Card First)
**Test Card Details:**
- Number: 4242 4242 4242 4242
- Expiry: Any future date
- CVC: Any 3 digits
- Postcode: Any valid postcode

### Step 4: PR Generation
After successful payment:
1. Success page should show "Generating press release..."
2. PR should be saved to GitHub (check recent commits)
3. Access PR at: https://presswire.ie/news/[filename].html

## 🔍 Monitoring Points

### 1. Build Credits
- Check: https://app.netlify.com/sites/majestic-cactus-4e1f49/deploys
- Should show: 1,000 credits remaining
- No builds should trigger for PR commits ([skip ci])

### 2. Stripe Dashboard
- Check: https://dashboard.stripe.com/webhooks
- Monitor webhook delivery status
- Look for `charge.updated` events from Payment Links

### 3. GitHub Repository
- Check: https://github.com/BuddySpuds/presswire-ie/commits/main
- PR commits should have [skip ci] prefix
- Files saved to news/ directory

### 4. Netlify Functions
- Check: Functions tab in Netlify dashboard
- Look for execution logs of:
  - verify-domain
  - save-pr-no-build
  - stripe-webhook

## 🚨 Troubleshooting

### If Email Not Received:
1. Check spam folder
2. Verify DNS still configured:
   ```bash
   nslookup -type=MX send.presswire.ie
   nslookup -type=TXT send.presswire.ie
   ```
3. Check Netlify function logs for errors

### If Payment Doesn't Generate PR:
1. Check webhook logs in Stripe dashboard
2. Use browser console to check localStorage for PR data
3. Success page has fallback generation - check console for errors

### If Builds Are Consuming Credits:
1. Ensure using `/api/save-pr-no-build` endpoint
2. Verify commits have [skip ci] in message
3. Check netlify.toml build settings

## 📊 Expected Metrics

### For First 10 Customers:
- Email verification rate: ~90% (some may use wrong email)
- Payment completion: ~60-70% (normal for checkout)
- PR generation success: 100% (with fallbacks)
- Build credit usage: 0 (all PRs use [skip ci])

## 🎯 Ready for First Customer!

The system is production-ready. Start with a test payment using the test card, then try a real €99 payment to fully validate the flow.

### Quick Links:
- Live Site: https://presswire.ie
- PR Generator: https://presswire.ie/generate.html
- Example PR: https://presswire.ie/news/plant-gift-announcement.html
- GitHub Repo: https://github.com/BuddySpuds/presswire-ie