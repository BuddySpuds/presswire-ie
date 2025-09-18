# Files to Remove from Public Repository

## 🚨 REMOVE IMMEDIATELY

### API Files (Contains Business Logic)
```bash
rm -rf api/
```
- api/admin.js - Admin authentication system
- api/generate.js - AI integration and PR generation
- api/verify-domain.js - Core verification logic
- api/send-email.js - Email templates
- api/stripe-webhook.js - Payment processing
- api/save-pr.js - Storage logic
- api/list-prs.js - Data retrieval
- All other API files

### Documentation (Reveals Implementation)
```bash
rm DEPLOYMENT_CHECKLIST.md
rm STRIPE_SETUP.md
rm QA_TEST_GUIDE.md
rm PROJECT_STATUS.md
rm VALIDATION_REPORT.md
rm CLAUDE.md
rm ARCHITECTURE_EXPLANATION.md
rm DNS_FIX_REQUIRED.md
rm PRODUCTION_CHECKLIST.md
rm PRODUCTION_TEST.md
rm STRIPE_INTEGRATION_GUIDE.md
rm STRIPE_MCP_SETUP.md
rm STRIPE_TEST_SETUP.md
rm DNS_SETUP_INSTRUCTIONS.md
rm LIGHTHOUSE_BENEFITS.md
rm PRESSWIRE_2.0_BLUEPRINT.md
rm SECURITY_AUDIT.md
rm EMAIL_SYSTEM_STATUS.md
```

### Admin/Internal Pages
```bash
rm admin.html
rm check-pr-status.html
rm deployment-guide.md
```

### Core Business Logic Pages
```bash
rm generate.html  # Contains verification logic
rm success.html   # Contains PR generation
```

### Test Files
```bash
rm -rf tests/
rm test-*.js
rm test-*.html
```

### Configuration Files (Keep Private)
```bash
rm netlify.toml  # Contains function configs
rm docker-compose.yml
rm package*.json  # Shows dependencies
```

## ✅ SAFE TO KEEP PUBLIC

### Marketing Pages
- index.html (remove any API calls first)
- about.html
- pricing.html (remove calculation logic)
- contact.html
- news/index.html (static version only)

### Legal Pages
- privacy.html
- terms.html

### Assets
- css/
- images/
- fonts/

### Basic Files
- robots.txt
- sitemap.xml
- README.md (use README_PUBLIC.md instead)
- .gitignore

## 📝 MODIFICATION NEEDED

### Files that need cleaning before keeping public:

1. **index.html**
   - Remove API endpoint references
   - Remove dynamic PR loading
   - Keep only marketing content

2. **news/index.html**
   - Remove dynamic loading script
   - Show static examples only
   - Remove API calls

3. **pricing.html**
   - Remove price calculation logic
   - Remove discount system
   - Show prices only

## 🔄 MIGRATION COMMANDS

```bash
# 1. Create backup
cp -r . ../presswire-backup

# 2. Create new private repo
gh repo create presswire-ie-private --private

# 3. Move sensitive files to private repo
git remote add private https://github.com/BuddySpuds/presswire-ie-private
git push private main

# 4. Remove sensitive files from public repo
# Run the rm commands above
git add .
git commit -m "Remove sensitive files - moving to private repo"
git push origin main

# 5. Make current repo public-safe or create new public repo
gh repo create presswire-ie-public --public
```

## ⚠️ CRITICAL REMINDERS

1. **BACKUP EVERYTHING FIRST**
2. **Ensure Netlify still has access to private repo**
3. **Update GitHub token in Netlify if changing repos**
4. **Test everything after migration**
5. **Never commit API keys or secrets**

## 🔐 After Removal

Your public repo should only contain:
- Marketing website
- Static content
- Public assets
- Legal pages
- Contact information

Everything else should be in your private repository.