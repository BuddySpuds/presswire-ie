# PressWire.ie - Domain-Verified Press Release Platform

The only domain-verified PR platform in Ireland. Your press release goes live in 60 seconds, not 60 hours.

## 🚀 Quick Start

### Option 1: Docker (Recommended)
```bash
# Clone the repository
git clone https://github.com/yourusername/presswire-ie
cd presswire-ie

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start with Docker
docker-compose up

# Visit http://localhost:2080
```

### Option 2: Local Node.js
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev

# Visit http://localhost:4000
```

## 📝 Environment Setup

1. **OpenRouter API Key** (Required for AI)
   - Sign up at [openrouter.ai](https://openrouter.ai)
   - Get your API key
   - Add to `.env`: `OPENROUTER_API_KEY=sk-or-...`

2. **Stripe Keys** (Required for payments)
   - Sign up at [stripe.com](https://stripe.com)
   - Get test keys from Dashboard
   - Add to `.env`

3. **GitHub Token** (Optional for PR storage)
   - Create a token at GitHub Settings > Developer settings
   - Add to `.env`

## 🧪 Testing

```bash
# Run API tests
npm test

# Test individual endpoints
curl -X POST http://localhost:4000/api/verify-domain \
  -H "Content-Type: application/json" \
  -d '{"action":"send-code","email":"test@company.ie"}'
```

## 🚢 Deployment

### Deploy to Netlify (Recommended)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### Deploy to GitHub Pages (Static only)
```bash
# Push to GitHub
git add .
git commit -m "Initial deploy"
git push origin main

# Enable GitHub Pages in repository settings
# Add CNAME file with your domain
```

### Configure DNS for presswire.ie
```
A Records:
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153

CNAME Record:
www -> yourusername.github.io
```

## 📁 Project Structure

```
presswire-ie/
├── index.html              # Landing page
├── generate.html           # PR submission form
├── api/                    # Serverless functions
│   ├── verify-domain.js    # Email verification
│   ├── lookup-company.js   # CRO integration
│   └── generate-pr.js      # AI PR generation
├── pr/                     # Generated press releases
├── docker-compose.yml      # Docker configuration
├── netlify.toml           # Netlify configuration
└── package.json           # Dependencies
```

## 🔒 Security Features

- **Domain Verification**: Only @company.ie can publish for company.ie
- **CRO Authentication**: Validates against Irish Companies Registration Office
- **Free Email Blocking**: Gmail, Yahoo, etc. are blocked
- **Rate Limiting**: Prevents abuse
- **Token-Based Auth**: Secure publishing tokens

## 💰 Pricing Tiers

- **Starter (€99)**: Basic PR distribution
- **Professional (€199)**: AI-enhanced content + media list
- **Enterprise (€399)**: Priority placement + multimedia

## 📊 Analytics

View your PR performance:
- Page views
- Click-through rates
- Media pickups
- Geographic distribution

## 🤝 Support

- Email: support@presswire.ie
- Documentation: [docs.presswire.ie](https://docs.presswire.ie)
- GitHub Issues: [Report bugs](https://github.com/yourusername/presswire-ie/issues)

## 📜 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**Robert Porter**
- GitHub: [@BuddySpuds](https://github.com/BuddySpuds)
- Copyright © 2025 Robert Porter. All rights reserved.

---

Built with ❤️ for Irish businesses 🇮🇪 by Robert Porter