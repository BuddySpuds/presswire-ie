# Irish Business PR Wire - MVP Deployment Guide

## 🚀 Quick Start Guide

This MVP allows you to launch a PR newswire service with minimal setup. The system generates static HTML pages that are SEO-optimized and requires no database.

## Architecture Overview

```
├── Static Hosting (GitHub Pages/Netlify)
│   ├── index.html (Landing page)
│   ├── generate.html (PR submission form)
│   └── pr/ (Generated press releases)
│
├── Serverless Function (Netlify/Vercel)
│   └── api/generate.js (Handles form submission)
│
└── Optional: GitHub Repository
    └── Auto-deploys on commit
```

## Option 1: Deploy with Netlify (Recommended)

### Step 1: Prepare Your Files

1. Create a new folder for your project
2. Add these files:
   - `index.html` (landing page)
   - `generate.html` (form page)
   - `netlify.toml` (configuration)
   - `netlify/functions/generate.js` (API function)

### Step 2: Create netlify.toml

```toml
[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

### Step 3: Deploy to Netlify

1. Push your code to GitHub
2. Go to [Netlify](https://netlify.com)
3. Click "New site from Git"
4. Connect your GitHub repository
5. Deploy!

### Step 4: Set Environment Variables

In Netlify Dashboard > Site Settings > Environment Variables:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
GITHUB_TOKEN=ghp_... (optional, for auto-saving)
GITHUB_OWNER=your-username (optional)
GITHUB_REPO=pr-directory (optional)
OPENAI_API_KEY=sk-... (optional, for better content)
```

## Option 2: Deploy with Vercel

### Step 1: Create vercel.json

```json
{
  "functions": {
    "api/generate.js": {
      "maxDuration": 10
    }
  }
}
```

### Step 2: Deploy

```bash
npm i -g vercel
vercel
```

## Option 3: GitHub Pages + Netlify Functions

This gives you free hosting for the static site and serverless functions.

### Step 1: Setup GitHub Pages

1. Create a repository called `your-username.github.io`
2. Add your HTML files
3. Enable GitHub Pages in Settings

### Step 2: Setup Netlify Functions (Just for API)

1. Create a separate repository for functions
2. Deploy only the functions to Netlify
3. Update your form to point to the Netlify function URL

## Setting Up Payments (Stripe)

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up for an account
3. Get your test API keys

### Step 2: Create Payment Links (Simple MVP)

Instead of complex checkout, use Stripe Payment Links:

1. In Stripe Dashboard, go to Payment Links
2. Create links for each package (€99, €199, €399)
3. Add the links to your form

### Step 3: Webhook for Confirmation

```javascript
// Simple webhook handler
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  
  if (event.type === 'payment_intent.succeeded') {
    // Generate PR
    generatePressRelease(event.data.object.metadata);
  }
  
  res.json({received: true});
});
```

## Testing Your MVP

### 1. Test Form Submission

```bash
curl -X POST https://your-site.netlify.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "pr_title": "Test Launch",
    "key_points": "Test points"
  }'
```

### 2. Test CRO Integration

The form includes CRO verification. Test with real CRO numbers:
- Example: 123456 (replace with real number)

### 3. Test SEO

Use Google's Rich Results Test:
- https://search.google.com/test/rich-results

## Going Live Checklist

### Before Launch:

- [ ] Update Stripe to live keys
- [ ] Update form action URLs
- [ ] Add Google Analytics
- [ ] Submit sitemap to Google
- [ ] Test on mobile devices
- [ ] Add robots.txt
- [ ] Set up SSL (automatic with Netlify/Vercel)

### robots.txt

```
User-agent: *
Allow: /
Sitemap: https://yourdomain.ie/sitemap.xml
```

### Basic sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.ie/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://yourdomain.ie/generate.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## Cost Breakdown

### Minimal MVP:
- Hosting: €0 (GitHub Pages)
- Functions: €0 (Netlify free tier)
- Payment Processing: 2.9% + 30c per transaction
- **Total: <€10/month**

### Production Ready:
- Hosting: €0-20/month (Netlify/Vercel)
- Domain: €15/year
- Email: €5/month (optional)
- **Total: €25-30/month**

## Scaling Beyond MVP

When you're ready to scale:

### 1. Add a Database (Supabase)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

// Store PR data
const { data, error } = await supabase
  .from('press_releases')
  .insert([
    { company_name, content, cro_number }
  ])
```

### 2. Add AI Content Generation

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateBetterContent(data) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a PR writer for Irish businesses..."
      },
      {
        role: "user",
        content: `Generate a press release for ${data.company_name} about ${data.pr_title}`
      }
    ]
  });
  
  return completion.choices[0].message.content;
}
```

### 3. Add Analytics

```javascript
// Track conversions
gtag('event', 'purchase', {
  value: 99.00,
  currency: 'EUR',
  transaction_id: '12345'
});
```

## Troubleshooting

### Common Issues:

**Form not submitting:**
- Check CORS settings
- Verify API endpoint URL
- Check browser console for errors

**Payment not processing:**
- Verify Stripe keys
- Check webhook configuration
- Test with Stripe CLI

**PR not generating:**
- Check function logs in Netlify/Vercel
- Verify environment variables
- Test API directly with curl

## Support & Next Steps

1. **Test with friends/colleagues first**
2. **Get 10 paying customers**
3. **Iterate based on feedback**
4. **Scale infrastructure as needed**

## Quick Launch Commands

```bash
# Clone and setup
git clone https://github.com/your-repo/pr-wire-mvp
cd pr-wire-mvp

# Install dependencies (if any)
npm install

# Test locally
npx serve .

# Deploy to Netlify
netlify deploy --prod

# Or deploy to Vercel
vercel --prod
```

## Revenue Projections

With this MVP:
- 10 PRs/week = €990-3,990/week
- 40 PRs/month = €3,960-15,960/month
- Break even: ~4 customers/month

## Legal Requirements

Remember to add:
- Terms of Service
- Privacy Policy
- Cookie Notice (if using analytics)
- VAT registration (if applicable)

---

**Ready to launch? This MVP can be live in under 2 hours!**

Questions? Contact: your-email@domain.ie