# 🚨 URGENT: DNS Configuration Fix Required

## The Problem
Resend is configured to send from `send.presswire.ie` but the MX and SPF records are on the root domain `presswire.ie`.

## Required DNS Changes in Netlify

### ADD these records:

1. **MX Record for Subdomain:**
   ```
   Type: MX
   Name: send
   Value: 10 feedback-smtp.eu-west-1.amazonses.com
   Priority: 10 (if separate field)
   TTL: 3600
   ```

   **In Netlify DNS Panel:**
   - Record Type: MX
   - Subdomain: `send` (just the word "send", not "send.presswire.ie")
   - Value: `10 feedback-smtp.eu-west-1.amazonses.com`

2. **TXT/SPF Record for Subdomain:**
   ```
   Type: TXT
   Name: send
   Value: v=spf1 include:amazonses.com ~all
   TTL: 3600
   ```

   **In Netlify DNS Panel:**
   - Record Type: TXT
   - Subdomain: `send`
   - Value: `v=spf1 include:amazonses.com ~all`

### Already Correct:
- ✅ DKIM: `resend._domainkey.presswire.ie` (verified)
- ✅ DMARC: `_dmarc.presswire.ie`
- ✅ Root MX and SPF (but not used by Resend)

## How to Add in Netlify:

1. Go to Netlify Dashboard
2. Domain settings → DNS settings
3. Add DNS record
4. For the MX record:
   - Type: MX
   - Subdomain: `send` (NOT send.presswire.ie, just `send`)
   - Value: `10 feedback-smtp.eu-west-1.amazonses.com`
5. For the TXT record:
   - Type: TXT
   - Subdomain: `send`
   - Value: `v=spf1 include:amazonses.com ~all`

## Alternative Solution:

Change Resend to use the root domain instead of subdomain:
1. In Resend dashboard, change sending domain from `send.presswire.ie` to `presswire.ie`
2. Update the "from" address in code to use `noreply@presswire.ie` instead of `noreply@send.presswire.ie`

## Why This Is Happening:

The code is trying to send emails but Resend is rejecting them because:
1. Resend expects to send from `send.presswire.ie`
2. But `send.presswire.ie` has no MX or SPF records
3. So Resend can't verify it's authorized to send from that subdomain

Once you add these DNS records, emails will start working within 5-10 minutes!