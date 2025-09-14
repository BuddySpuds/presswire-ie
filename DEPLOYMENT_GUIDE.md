# 🚀 Complete Deployment Guide for PressWire.ie

## Step 1: Backup Your Project First

```bash
# Create a backup of your current project
cd /Users/robertporter
cp -r Agentic_NewsWire Agentic_NewsWire_backup_$(date +%Y%m%d)

# Verify backup was created
ls -la | grep Agentic_NewsWire_backup
```

## Step 2: Prepare for GitHub

### Remove Sensitive Information

```bash
cd /Users/robertporter/Agentic_NewsWire

# IMPORTANT: Remove API key from tracking
cp .env .env.backup
echo "OPENROUTER_API_KEY=" > .env

# Make sure .env is in gitignore
cat .gitignore | grep "^.env$" || echo ".env" >> .gitignore
```

## Step 3: Create GitHub Repository

### On GitHub.com:

1. Go to https://github.com/new
2. Create a new repository:
   - **Repository name**: `presswire-ie`
   - **Description**: "Domain-verified press release distribution for Irish businesses"
   - **Public** (required for GitHub Pages)
   - **DO NOT** initialize with README (we already have one)
   - Click **Create repository**

### On Your Computer:

```bash
# Initialize git in your project
cd /Users/robertporter/Agentic_NewsWire
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: PressWire.ie MVP"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/presswire-ie.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Deploy to Netlify (Recommended)

### Option A: Deploy via Netlify Web Interface

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub**
4. Select your `presswire-ie` repository
5. Configure build settings:
   - **Build command**: (leave empty)
   - **Publish directory**: `.`
6. Click **"Deploy site"**

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify init
# Choose "Create & configure a new site"
# Team: Choose your team
# Site name: presswire-ie (or leave blank for random)

# Deploy to production
netlify deploy --prod
```

### Add Environment Variables in Netlify:

1. Go to your site in Netlify Dashboard
2. Click **Site settings** → **Environment variables**
3. Add these variables:

```
OPENROUTER_API_KEY = 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
NODE_ENV = production
```

## Step 5: Configure Your Domain (presswire.ie)

### Where Did You Buy Your Domain?

#### If from Blacknight/Register365/Irish Registrar:

1. **Log into your domain registrar's control panel**

2. **Find DNS Settings** (might be called "DNS Management" or "Name Servers")

3. **Choose one option:**

### Option A: Use Netlify DNS (Easiest)

1. In Netlify, go to **Domain settings** → **Add custom domain**
2. Enter `presswire.ie`
3. Netlify will give you 4 nameservers like:
   ```
   dns1.p04.nsone.net
   dns2.p04.nsone.net
   dns3.p04.nsone.net
   dns4.p04.nsone.net
   ```

4. **At your domain registrar**, change nameservers to Netlify's nameservers

### Option B: Keep Current DNS Provider

1. In Netlify, go to **Domain settings** → **Add custom domain**
2. Enter `presswire.ie`
3. Netlify will give you a CNAME or A record

4. **At your domain registrar**, add DNS records:

```
Type: A
Host: @
Value: 75.2.60.5

Type: CNAME
Host: www
Value: YOUR-SITE-NAME.netlify.app
```

## Step 6: SSL Certificate (Automatic)

Once DNS is configured:

1. In Netlify → **Domain settings** → **HTTPS**
2. Click **"Verify DNS configuration"**
3. Click **"Provision certificate"**
4. Wait 5-10 minutes for SSL to activate

## Step 7: GitHub Pages (Alternative/Backup)

If you want GitHub Pages as backup:

```bash
# Ensure CNAME file has your domain
echo "presswire.ie" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push

# In GitHub repository settings:
# 1. Go to Settings → Pages
# 2. Source: Deploy from branch
# 3. Branch: main, folder: / (root)
# 4. Custom domain: presswire.ie
```

## Step 8: Test Your Deployment

### Check These URLs:
```bash
# Your Netlify URL (works immediately)
https://presswire-ie.netlify.app

# Your custom domain (works after DNS propagation, 1-24 hours)
https://presswire.ie
https://www.presswire.ie

# Test API endpoints
curl https://presswire.ie/api/lookup-company \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"croNumber":"682195","companyName":"ACTIVATE"}'
```

## Step 9: Post-Deployment Tasks

### Update Your Code for Production:

1. **Update API URLs in JavaScript**:
   - Change `http://localhost:4000` to `https://presswire.ie`

2. **Update .env for production** (in Netlify):
   ```
   NODE_ENV=production
   OPENROUTER_API_KEY=your-key
   STRIPE_PUBLISHABLE_KEY=pk_live_xxx (when ready)
   ```

3. **Monitor your site**:
   - Netlify provides analytics
   - Set up Google Analytics
   - Monitor API usage in OpenRouter dashboard

## Step 10: Backup Recovery (If Needed)

If something goes wrong:

```bash
# Restore from backup
cd /Users/robertporter
rm -rf Agentic_NewsWire
cp -r Agentic_NewsWire_backup_[DATE] Agentic_NewsWire

# Restore .env
cd Agentic_NewsWire
cp .env.backup .env
```

## 🎯 Quick Checklist

- [ ] Backup created locally
- [ ] .env file cleaned (no secrets in git)
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Netlify site created
- [ ] Environment variables added to Netlify
- [ ] Custom domain added to Netlify
- [ ] DNS configured at registrar
- [ ] SSL certificate provisioned
- [ ] Site accessible at presswire.ie

## 📞 Support Contacts

- **Netlify Support**: https://www.netlify.com/support/
- **GitHub Pages**: https://docs.github.com/en/pages
- **Your Domain Registrar Support**: Check their website

## 🚨 Important Security Notes

1. **NEVER commit .env with real keys to GitHub**
2. **Use Netlify environment variables for production**
3. **Keep your .env.backup file locally only**
4. **Rotate API keys if accidentally exposed**

---

**Estimated Time**: 30-60 minutes (plus DNS propagation)
**Cost**: Free (Netlify free tier handles 100GB bandwidth/month)

Ready to deploy? Start with Step 1: Backup!