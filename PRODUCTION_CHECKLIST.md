# PressWire.ie Production Checklist

## ✅ Completed Items

### DNS & Email System
- [x] MX records configured for both root and send subdomain
- [x] SPF (TXT) records configured for both domains
- [x] DKIM record configured (resend._domainkey)
- [x] DMARC policy configured
- [x] Email verification system tested and working
- [x] Removed temporary code accepting any 6-digit code

### Build Management
- [x] Implemented [skip ci] for PR commits to preserve credits
- [x] Created save-pr-no-build.js endpoint for credit-free PR saves
- [x] Test files moved to tests/ directory
- [x] Production prices restored (€99/€199/€399)

### Security & Verification
- [x] Domain verification requires actual email ownership
- [x] CRO number validation implemented
- [x] Free email providers blocked
- [x] Rate limiting on API endpoints

## ⚠️ Items Needing Attention (After Credits Renewed)

### Stripe Integration
- [ ] Fix webhook to handle `charge.updated` events from Payment Links
- [ ] Test complete payment → PR generation flow
- [ ] Verify webhook signature validation
- [ ] Add proper error handling for failed payments

### Testing Required
1. **Full End-to-End Test:**
   - [ ] Register with real .ie domain email
   - [ ] Receive and enter verification code
   - [ ] Complete payment via Stripe
   - [ ] Verify PR is generated and published
   - [ ] Check PR is accessible at correct URL

2. **Webhook Testing:**
   - [ ] Verify webhook receives Payment Link events
   - [ ] Confirm PR generation triggers after payment
   - [ ] Test webhook retry logic

### Environment Variables to Verify
```bash
# In Netlify Dashboard
STRIPE_SECRET_KEY=sk_live_xxx        # Production key
STRIPE_WEBHOOK_SECRET=whsec_xxx      # Must match Stripe dashboard
GITHUB_TOKEN=ghp_xxx                 # For saving PRs
GITHUB_OWNER=robertporter
GITHUB_REPO=Agentic_NewsWire
SMTP_HOST=smtp.resend.com
SMTP_USER=resend
SMTP_PASS=re_xxx                    # Resend API key
```

## 🚀 Launch Readiness

### Before Going Live
1. [ ] Upgrade Netlify to Personal plan ($9/month)
2. [ ] Test with real payment (not test cards)
3. [ ] Verify PRs save without triggering builds
4. [ ] Monitor first 5-10 real submissions
5. [ ] Set up error alerting (Sentry or similar)

### Critical Paths to Test
- **Happy Path:** Email → Verify → Pay → PR Published
- **Webhook Failure:** Ensure fallback PR generation works
- **Build Credit Protection:** Confirm [skip ci] prevents builds

### Known Limitations (MVP)
- Using GitHub as database (fine for MVP)
- No user accounts or history
- Manual refund process via Stripe
- No media upload capability yet

## 📊 Monitoring

### Key Metrics to Track
- Email verification success rate
- Payment completion rate
- PR generation success rate
- Build credit consumption
- Webhook delivery success

### Where to Check
- **Stripe Dashboard:** Payment success, webhook health
- **Netlify Dashboard:** Build credits, function logs
- **GitHub Repo:** PR commits with [skip ci]
- **DNS Propagation:** `nslookup -type=MX send.presswire.ie`

## 🔧 Quick Fixes

### If Emails Stop Working
```bash
# Check DNS
nslookup -type=MX send.presswire.ie
nslookup -type=TXT send.presswire.ie

# Test API directly
curl -X POST https://presswire.ie/api/verify-domain \
  -H "Content-Type: application/json" \
  -d '{"action":"send-code","email":"test@yourdomain.ie"}'
```

### If Webhooks Fail
1. Check webhook secret matches in both Stripe and Netlify
2. Look for `charge.updated` events, not `checkout.session.completed`
3. Use success.html fallback for PR generation

### If Builds Consume Credits
1. Ensure all PR saves use `/api/save-pr-no-build`
2. Verify commits include [skip ci] prefix
3. Consider GitHub Actions for PR saves instead

## 📝 Notes

- Current build credits: 0/300 (exhausted)
- Upgrade planned: Personal plan in ~8 hours
- Test payment made: €1 via Payment Link (successful)
- Email system: Fixed with DNS updates
- PR storage: GitHub via API (no builds triggered)