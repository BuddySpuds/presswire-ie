# Stripe Payment Links Configuration

## Overview
PressWire.ie uses Stripe Payment Links for processing payments. This guide explains how to set up the payment links for the three pricing tiers.

## Pricing Tiers

### 1. Standard (€99)
- Basic press release
- Domain verification
- SEO-optimized backlinks
- 24-hour editing window
- Analytics dashboard

### 2. Professional (€149)
- Everything in Standard
- Priority indexing
- Extended distribution
- 48-hour editing window
- Enhanced analytics

### 3. Premium (€249)
- Everything in Professional
- Featured placement
- Social media boost
- 7-day editing window
- Full analytics suite
- Priority support

## Setup Instructions

### Step 1: Create Payment Links in Stripe Dashboard

1. Log into your Stripe Dashboard
2. Navigate to **Payment Links** (Product catalog → Payment links)
3. Click **+ New payment link**

### Step 2: Create Standard Tier Link

1. **Product details:**
   - Name: `PressWire.ie - Standard Press Release`
   - Description: `Domain-verified press release with SEO backlinks`
   - Price: `€99.00`
   - Type: `One-time`

2. **After payment settings:**
   - Success URL: `https://presswire.ie/success?tier=standard`
   - Cancel URL: `https://presswire.ie/generate.html`

3. **Advanced options:**
   - Allow promotion codes: `Yes`
   - Collect billing address: `Yes`
   - Collect phone number: `Optional`

4. **Metadata (important for tracking):**
   ```
   product_type: press_release
   tier: standard
   platform: presswire_ie
   ```

### Step 3: Create Professional Tier Link

1. **Product details:**
   - Name: `PressWire.ie - Professional Press Release`
   - Description: `Priority press release with extended distribution`
   - Price: `€149.00`
   - Type: `One-time`

2. **After payment settings:**
   - Success URL: `https://presswire.ie/success?tier=professional`
   - Cancel URL: `https://presswire.ie/generate.html`

3. **Advanced options:**
   - Allow promotion codes: `Yes`
   - Collect billing address: `Yes`
   - Collect phone number: `Optional`

4. **Metadata:**
   ```
   product_type: press_release
   tier: professional
   platform: presswire_ie
   ```

### Step 4: Create Premium Tier Link

1. **Product details:**
   - Name: `PressWire.ie - Premium Press Release`
   - Description: `Featured press release with maximum visibility`
   - Price: `€249.00`
   - Type: `One-time`

2. **After payment settings:**
   - Success URL: `https://presswire.ie/success?tier=premium`
   - Cancel URL: `https://presswire.ie/generate.html`

3. **Advanced options:**
   - Allow promotion codes: `Yes`
   - Collect billing address: `Yes`
   - Collect phone number: `Optional`

4. **Metadata:**
   ```
   product_type: press_release
   tier: premium
   platform: presswire_ie
   ```

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
STRIPE_PAYMENT_LINK_STANDARD=https://buy.stripe.com/xxx_standard
STRIPE_PAYMENT_LINK_PROFESSIONAL=https://buy.stripe.com/xxx_professional
STRIPE_PAYMENT_LINK_PREMIUM=https://buy.stripe.com/xxx_premium

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

## Going Live Checklist

- [ ] Create all three payment links in live mode
- [ ] Configure success/cancel URLs correctly
- [ ] Set up production discount codes
- [ ] Add payment links to environment variables
- [ ] Configure webhook endpoint
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