# Stripe Configuration Guide

## Overview
PressWire.ie uses Stripe for payment processing. This comprehensive guide covers all Stripe-related setup including Payment Links, MCP integration, webhooks, and testing.

## Pricing Tiers

### 1. Single Press Release (Launch Special)
- **€49** ~~€99~~ (50% OFF - Limited Time)
- Domain verification
- CRO verification
- SEO-optimized backlinks
- 24-hour edit window
- Analytics dashboard

### 2. Professional Bundle
- **€349** for 10 press releases (Save €641!)
- €34.90 per PR vs €99 single price
- Everything in Single PR
- Use within 12 months
- Priority indexing
- 48-hour edit window
- Enhanced analytics
- Priority support

### 3. Enterprise (Coming Soon)
- Custom pricing for high-volume needs
- Launching Q1 2026
- Unlimited press releases
- White-label options
- API access
- Dedicated account manager

## Setup Methods

### Method 1: Stripe MCP Integration (Recommended)

1. **Install Stripe MCP Server:**
   ```bash
   npx @modelcontextprotocol/create-server stripe
   ```

2. **Configure MCP in Claude:**
   - The `.mcp.json` file is already configured
   - Restart Claude to activate the MCP connection

3. **Use MCP Commands:**
   ```
   mcp__stripe__list_products     # List products
   mcp__stripe__list_prices        # List prices
   mcp__stripe__create_payment_link # Create payment links
   ```

### Method 2: Manual Setup via Stripe Dashboard

#### Step 1: Create Payment Links

1. Log into your Stripe Dashboard
2. Navigate to **Payment Links** (Product catalog → Payment links)
3. Click **+ New payment link**

#### Step 2: Create Single PR Link (Launch Special)

1. **Product details:**
   - Name: `PressWire.ie - Single Press Release (Launch Special)`
   - Description: `Domain-verified press release with SEO backlinks - 50% OFF`
   - Price: `€49.00` (was €99.00)
   - Type: `One-time`

2. **After payment settings:**
   - Success URL: `https://presswire.ie/success?tier=single`
   - Cancel URL: `https://presswire.ie/generate.html`

3. **Advanced options:**
   - Allow promotion codes: `Yes`
   - Collect billing address: `Yes`
   - Collect phone number: `Optional`

4. **Metadata (important for tracking):**
   ```
   product_type: press_release
   tier: single
   platform: presswire_ie
   promo: launch_special
   ```

### Step 3: Create Professional Bundle Link

1. **Product details:**
   - Name: `PressWire.ie - Professional Bundle (10 PRs)`
   - Description: `10 press releases - Save €641! Use within 12 months`
   - Price: `€349.00`
   - Type: `One-time`

2. **After payment settings:**
   - Success URL: `https://presswire.ie/success?tier=professional&bundle=10`
   - Cancel URL: `https://presswire.ie/generate.html`

3. **Advanced options:**
   - Allow promotion codes: `Yes`
   - Collect billing address: `Yes`
   - Collect phone number: `Optional`

4. **Metadata:**
   ```
   product_type: press_release_bundle
   tier: professional
   bundle_size: 10
   platform: presswire_ie
   ```

### Step 4: Enterprise (No Stripe Link Needed Yet)

- Enterprise is "Coming Soon" - launches Q1 2026
- Waitlist form collects leads for future outreach
- No payment link needed at this time
- Custom pricing will be handled separately when launched

## Step 5: Configure Discount Codes

### Create Discount Coupons in Stripe:

1. Go to **Products → Coupons**
2. Click **+ New coupon**
3. Create these standard codes:

   **Launch Offer (50% off):**
   - ID: `LAUNCH50`
   - Discount: `50%`
   - Duration: `Once`
   - Max redemptions: `100`
   - Valid until: `March 31, 2025`

   **Partner Discount (20% off):**
   - ID: `PARTNER20`
   - Discount: `20%`
   - Duration: `Once`
   - Max redemptions: `Unlimited`

   **Beta Tester (100% off):**
   - ID: `BETATEST`
   - Discount: `100%`
   - Duration: `Once`
   - Max redemptions: `10`
   - Note: For testing and admin use

## Step 6: Add Payment Links to Environment

Once created, add the payment link URLs to your `.env` file:

```env
# Stripe Payment Links
STRIPE_PAYMENT_LINK_SINGLE=https://buy.stripe.com/xxx_single_49
STRIPE_PAYMENT_LINK_PROFESSIONAL=https://buy.stripe.com/xxx_bundle_349
# Enterprise - Coming Soon (no link yet)

# Stripe API Keys (for webhook processing)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Step 7: Update Frontend Integration

The payment links are already integrated in `generate.html`. The system will:
1. Collect PR details and verify domain
2. Generate the press release
3. Store in session/local storage
4. Redirect to appropriate Stripe payment link
5. Handle return from Stripe on success page

## Step 8: Webhook Configuration

Set up webhook endpoint in Stripe Dashboard:
1. Go to **Developers → Webhooks**
2. Add endpoint: `https://presswire.ie/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`

## Testing

### Test Mode:
1. Use Stripe test mode payment links first
2. Test card: `4242 4242 4242 4242`
3. Any future expiry date and CVC

### Test Discount Codes:
1. Create test coupons in test mode
2. Verify they apply correctly at checkout
3. Test edge cases (expired, max usage, etc.)

## Environment Variables Required

Add these to Netlify Dashboard → Site Settings → Environment Variables:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxx          # From Stripe Dashboard → API Keys
STRIPE_PUBLISHABLE_KEY=pk_live_xxx     # Public key (optional if using payment links)
STRIPE_WEBHOOK_SECRET=whsec_xxx        # From webhook endpoint settings

# Payment Links (after creating in Stripe)
STRIPE_PAYMENT_LINK_SINGLE=https://buy.stripe.com/xxx
STRIPE_PAYMENT_LINK_PROFESSIONAL=https://buy.stripe.com/xxx
```

## Webhook Handler

The webhook handler (`api/stripe-webhook.js`) processes:
- Payment confirmations
- PR generation triggers
- Customer email notifications
- Credit allocation for bundles

## Going Live Checklist

- [ ] Create products in Stripe Dashboard
- [ ] Generate payment links for each tier
- [ ] Configure webhook endpoint in Stripe
- [ ] Add all environment variables to Netlify
- [ ] Test payment flow end-to-end
- [ ] Verify webhook signature validation
- [ ] Test discount codes
- [ ] Test complete flow with small real payment
- [ ] Enable Stripe Radar for fraud protection
- [ ] Set up email receipts in Stripe
- [ ] Configure VAT/tax settings for Ireland
- [ ] Enable Strong Customer Authentication (SCA)

## Support

For Stripe support: https://support.stripe.com
For PressWire.ie issues: support@presswire.ie

---
*Last updated: September 2025*
*Copyright © 2025 Robert Porter*