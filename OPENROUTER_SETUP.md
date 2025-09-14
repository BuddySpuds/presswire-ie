# OpenRouter API Setup Guide for PressWire.ie

## 🚀 Quick Setup (5 minutes)

### Option 1: Use Without API Key (Works Now!)
The app now works **without an API key**! It will use an enhanced fallback generator that creates professional press releases without AI. This is perfect for testing and MVP launch.

### Option 2: Get Free OpenRouter API Key (Recommended)

1. **Sign Up** (1 minute)
   - Go to https://openrouter.ai
   - Click "Sign Up"
   - Use Google/GitHub login for quick access

2. **Get Your API Key** (30 seconds)
   - Go to https://openrouter.ai/keys
   - Click "Create Key"
   - Copy the key (starts with `sk-or-v1-`)

3. **Add to Your .env File** (30 seconds)
   ```bash
   # Open .env file and add your key:
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```

4. **Restart the Server**
   ```bash
   # Kill current server (Ctrl+C) then:
   NODE_ENV=development PORT=4000 node server.js
   ```

## 💰 Pricing

### Free Tier Includes:
- **Google Gemini 2.0 Flash**: Free model, perfect for PR generation
- **No credit card required**
- **Unlimited requests** with free models

### Why Gemini Flash?
- Fast response time (< 2 seconds)
- High quality content generation
- Perfect for press releases
- Completely free to use

## 🧪 Test Your Setup

### Without API Key (Works Now):
```bash
curl -X POST http://localhost:4000/api/generate-pr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "company": {"name": "Test Co", "croNumber": "123456", "status": "Active"},
    "headline": "Test Company Announces Growth",
    "summary": "Company expands operations",
    "keyPoints": "• New office\n• 50 jobs\n• €5M investment",
    "contact": "info@test.ie",
    "package": "professional"
  }'
```

### With API Key:
Same command - will use AI for enhanced content generation!

## 📝 Current Status

Your app is configured to:
1. ✅ Work without an API key (fallback mode active)
2. ✅ Automatically use AI when key is added
3. ✅ Generate professional press releases either way

## 🎯 Next Steps

1. **For Testing**: You don't need an API key - it works now!
2. **For Production**: Get the free key for better content
3. **For Launch**: The fallback is good enough for MVP

---

**Note:** The app is fully functional without the API key. The fallback generator creates professional press releases that are perfectly suitable for launch. Adding the API key later will enhance the content quality but is not required.