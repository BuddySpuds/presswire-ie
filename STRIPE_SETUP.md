# 💳 Stripe Payment Setup Guide for PressWire.ie

## Quick Overview
Stripe will handle payments for your €99/€199/€399 press release packages. We'll use **Payment Links** for the MVP - no complex integration needed!

---

## Step 1: Create Stripe Account (5 minutes)

1. Go to https://stripe.com
2. Click **"Start now"**
3. Enter your details:
   - Email: Use your business email
   - Country: **Ireland**
   - Business name: Your company name
4. Verify your email

## Step 2: Complete Business Profile (10 minutes)

### In Stripe Dashboard → Settings → Business settings:

1. **Business details**:
   - Business type: Company
   - Industry: Software/Media
   - Company registration: Your CRO number
   - Website: https://presswire.ie

2. **Bank account** (for receiving payments):
   - IBAN: Your Irish business bank account
   - BIC/SWIFT: Your bank's code

3. **Identity verification**:
   - Upload ID (passport/driving license)
   - Proof of address

## Step 3: Get Your API Keys (Test Mode First!)

### Start with TEST keys:

1. Toggle **"Test mode"** ON (top right of dashboard)
2. Go to **Developers** → **API keys**
3. Copy these keys:

```
Publishable key: pk_test_51...
Secret key: sk_test_51...
```

4. Add to your Netlify environment variables:
```
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
```

## Step 4: Create Payment Links (Simple MVP Approach)

### This is the EASIEST way - no coding needed!

1. In Stripe Dashboard → **Payment Links**
2. Click **"+ New payment link"**

### Create 3 Payment Links:

#### Link 1: Starter Package (€99)
```
Product name: Press Release - Starter
Price: €99.00
Description: Basic press release with domain verification
After payment: Redirect to https://presswire.ie/success?package=starter
```

#### Link 2: Professional Package (€199)
```
Product name: Press Release - Professional
Price: €199.00
Description: AI-enhanced PR with media distribution
After payment: Redirect to https://presswire.ie/success?package=professional
```

#### Link 3: Enterprise Package (€399)
```
Product name: Press Release - Enterprise
Price: €399.00
Description: Premium PR with priority placement
After payment: Redirect to https://presswire.ie/success?package=enterprise
```

### Each link will give you a URL like:
```
https://buy.stripe.com/test_abc123xyz
```

## Step 5: Add Payment Links to Your Website

Edit your `generate.html` file to update the payment section:

```javascript
// In generate.html, update the processPayment function:
function processPayment() {
    const selectedPackage = document.querySelector('input[name="package"]:checked').value;

    // Your Stripe Payment Links
    const paymentLinks = {
        starter: 'https://buy.stripe.com/test_YOUR_STARTER_LINK',
        professional: 'https://buy.stripe.com/test_YOUR_PROFESSIONAL_LINK',
        enterprise: 'https://buy.stripe.com/test_YOUR_ENTERPRISE_LINK'
    };

    // Save form data to localStorage before redirect
    const formData = {
        email: document.getElementById('company-email').value,
        croNumber: document.getElementById('cro-number').value,
        companyName: document.getElementById('company-name').value,
        headline: document.getElementById('pr-headline').value,
        summary: document.getElementById('pr-summary').value,
        keyPoints: document.getElementById('pr-keypoints').value,
        contact: document.getElementById('pr-contact').value
    };
    localStorage.setItem('prDraft', JSON.stringify(formData));

    // Redirect to Stripe payment
    window.location.href = paymentLinks[selectedPackage];
}
```

## Step 6: Create Success Page

Create a new file `success.html`:

```html
<!DOCTYPE html>
<html lang="en-IE">
<head>
    <meta charset="UTF-8">
    <title>Payment Successful - PressWire.ie</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
            <h1 class="text-3xl font-bold mb-4">✅ Payment Successful!</h1>
            <p class="text-gray-600 mb-8">Your press release will be published within 60 seconds.</p>
            <div id="status"></div>
        </div>
    </div>

    <script>
    // On success page, retrieve saved data and generate PR
    window.onload = async () => {
        const params = new URLSearchParams(window.location.search);
        const package = params.get('package');
        const prData = JSON.parse(localStorage.getItem('prDraft'));

        if (prData) {
            // Call your API to generate the PR
            const response = await fetch('/api/generate-pr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                },
                body: JSON.stringify({...prData, package})
            });

            const result = await response.json();
            document.getElementById('status').innerHTML =
                `<a href="${result.pr.url}" class="text-blue-600 underline">View Your Press Release</a>`;

            // Clear saved data
            localStorage.removeItem('prDraft');
        }
    };
    </script>
</body>
</html>
```

## Step 7: Test Your Payment Flow

### With Test Cards:
```
Card number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
```

### Test the flow:
1. Fill out PR form on your site
2. Click payment button
3. Pay with test card
4. Verify redirect to success page
5. Check Stripe Dashboard for payment

## Step 8: Handle Webhooks (Optional for MVP)

For automatic PR publishing after payment:

1. In Stripe → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://presswire.ie/api/webhook`
3. Events to listen: `checkout.session.completed`

## Step 9: Go Live!

When ready for real payments:

1. Complete Stripe account activation (may take 1-2 days)
2. Toggle OFF "Test mode"
3. Get LIVE API keys
4. Update Netlify environment variables:
   ```
   STRIPE_PUBLISHABLE_KEY=pk_live_51...
   STRIPE_SECRET_KEY=sk_live_51...
   ```
5. Create new Payment Links with live keys
6. Update payment links in your code

## Step 10: VAT/Tax Settings

### For Irish VAT:
1. Go to **Settings** → **Tax settings**
2. Enable tax collection
3. Add VAT registration (if applicable)
4. Set default tax behavior: "Inclusive" (prices include VAT)

### Irish VAT Rates:
- Standard rate: 23%
- Your €99 price includes VAT: €80.49 + €18.51 VAT

## 📊 Monitoring Your Revenue

### Stripe Dashboard shows:
- Real-time payments
- Revenue analytics
- Customer details
- Payout schedule (usually 2-7 days)

### Your Revenue Projections:
```
10 PRs/week × €199 average = €1,990/week
40 PRs/month = €7,960/month
After Stripe fees (1.4% + €0.25): ~€7,650/month
```

## 🚨 Important Security Notes

1. **NEVER share your Secret Key** (sk_live_...)
2. **Only use Test keys during development**
3. **Add Stripe keys to Netlify, not your code**
4. **Enable 2FA on your Stripe account**

## 🎯 Quick Setup Checklist

- [ ] Stripe account created
- [ ] Business profile completed
- [ ] Test API keys obtained
- [ ] 3 Payment Links created (€99, €199, €399)
- [ ] Payment links added to website
- [ ] Success page created
- [ ] Test payment successful
- [ ] Ready for live mode

## 💡 Pro Tips

1. **Start with Payment Links** - Simplest approach, upgrade later
2. **Use Test Mode extensively** - Test everything before going live
3. **Set up email receipts** - Professional touch
4. **Enable Google Pay/Apple Pay** - Higher conversion
5. **Monitor failed payments** - Follow up with customers

---

**Estimated Setup Time**: 30 minutes
**Cost**: 1.4% + €0.25 per European card transaction
**Payout Schedule**: Daily/weekly to your Irish bank account

Ready to accept payments! 💰