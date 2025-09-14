# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Irish PR Wire - A verified press release distribution service for Irish businesses. This is an ultra-lean MVP that generates static HTML pages without requiring a traditional backend, using domain verification and CRO (Companies Registration Office) integration to ensure authenticity.

## Architecture

**Static Site + Serverless Functions Architecture:**

- **Frontend**: Clean, modern HTML landing page with embedded Tailwind CSS
  - `clean-modern-landing.html` - Main landing page with minimalist design
  - `generate.html` - Multi-step form for PR submission with verification
  - Static HTML files generated for each press release (SEO-optimized)

- **Verification System**:
  - Domain email verification (ensures only @company.ie emails can publish for company.ie)
  - CRO API integration for Irish business verification
  - MX record checking to validate real email domains
  - Blocks free email providers (Gmail, Yahoo, etc.)

- **Backend Services**:
  - Serverless functions (Netlify Functions or Vercel)
  - GitHub as storage (commits trigger auto-deployment)
  - No traditional database required

## Key Features & Differentiators

1. **Domain Verification**: Only verified company domain emails can publish (unique in Ireland)
2. **CRO Integration**: Automatic verification against Irish Companies Registration Office
3. **Instant Generation**: Press releases live in 60 seconds
4. **SEO Optimization**: Schema.org markup, meta tags, static HTML for best performance
5. **Tiered Pricing**: €99/€199/€399 packages via Stripe Payment Links

## Development Commands

```bash
# Local development
npx serve .
# or
python3 -m http.server 8000

# Deploy to Netlify
netlify deploy --prod

# Deploy to Vercel
vercel --prod

# Test form submission
curl -X POST https://your-site.netlify.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "email": "test@company.ie",
    "cro_number": "123456",
    "pr_title": "Test Launch"
  }'

# Test domain verification
curl -X POST https://your-site.netlify.app/api/verify-domain \
  -H "Content-Type: application/json" \
  -d '{"email": "john@company.ie"}'
```

## API Endpoints

### `/api/verify-domain`
- Validates email domain ownership
- Checks MX records
- Sends verification code
- Returns temporary publishing token

### `/api/generate`
- Requires valid verification token
- Generates press release HTML
- Commits to GitHub (triggers deployment)
- Processes payment via Stripe

## Environment Variables

```bash
# Required
STRIPE_SECRET_KEY       # Stripe API key
STRIPE_PUBLISHABLE_KEY  # Public Stripe key
SMTP_HOST              # Email server for verification
SMTP_USER              # Email username
SMTP_PASS              # Email password

# Optional (for enhanced features)
GITHUB_TOKEN           # For auto-saving PRs to GitHub
GITHUB_OWNER          # GitHub username
GITHUB_REPO           # Repository name for PR storage
OPENAI_API_KEY        # For AI-enhanced content generation
CRO_API_KEY           # If CRO requires authentication
```

## Project Structure

```
irish-pr-wire/
├── index.html              # Clean modern landing page
├── generate.html           # PR submission form with verification
├── api/
│   ├── generate.js        # Serverless function for PR generation
│   └── verify-domain.js   # Domain verification endpoint
├── companies/             # Generated static PR pages
│   └── [cro-number].html  # Individual PR pages
├── netlify.toml           # Netlify configuration
└── deployment-guide.md    # Deployment instructions
```

## Design Principles

- **Clean & Modern**: Minimalist design inspired by Stripe/Linear/Notion
- **Trust-First**: Verification badges and security messaging prominent
- **Irish Market Focus**: Green accents, CRO integration, .ie domain emphasis
- **Performance**: Static HTML generation for fastest loading and best SEO
- **Simplicity**: No complex build process, minimal dependencies

## Verification Flow

1. User enters company email (e.g., john@company.ie)
2. System validates:
   - Domain has valid MX records
   - Not a free email provider
   - Matches claimed company domain
3. 6-digit code sent to email
4. User enters code to receive publishing token
5. Token required to publish press release

## Security Considerations

- Domain verification prevents unauthorized PR publication
- Rate limiting on verification attempts
- Temporary tokens expire after 1 hour
- Payment verification before PR generation
- No storage of sensitive data (stateless approach)

## Testing Checklist

- [ ] Domain verification with real .ie domain
- [ ] CRO number validation
- [ ] Payment flow with Stripe test keys
- [ ] PR generation and static file creation
- [ ] SEO markup validation (Google Rich Results Test)
- [ ] Mobile responsiveness
- [ ] Form validation and error handling

## Scaling Path

Current MVP → Future Enhancements:
1. Add Supabase for PR analytics and history
2. Implement AI content enhancement with OpenAI
3. Add media kit uploads (images, PDFs)
4. Create journalist portal for PR discovery
5. Add email distribution to media contacts
6. Implement auto-generation for all 500,000+ CRO companies