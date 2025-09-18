# 🚨 IMPORTANT: How PressWire.ie Serves Press Releases

## The Current Architecture Problem

### What We Thought Would Happen:
1. PR is saved to GitHub with `[skip ci]`
2. File immediately appears on the website
3. No build needed

### What ACTUALLY Happens:
1. PR is saved to GitHub with `[skip ci]`
2. **File is in GitHub but NOT on the live site yet** ❌
3. A build IS needed to deploy new files to Netlify's CDN

## The Reality Check

**Netlify doesn't serve directly from GitHub in real-time.** It needs to:
1. Pull the latest code from GitHub
2. Build the site (even if just copying files)
3. Deploy to their CDN
4. Then the new PR is visible

## Solutions (Pick One)

### Option 1: Allow Selective Builds (RECOMMENDED)
- Remove `[skip ci]` from PR commits
- Let PRs trigger builds (uses ~1 credit per PR)
- With 1,000 credits/month, you can handle ~1,000 PRs
- Cost: ~1 credit per customer

### Option 2: Manual Daily Deploy
- Keep `[skip ci]` on PRs
- Manually trigger one build per day
- All PRs from that day go live at once
- Cost: 30 credits/month (1 per day)

### Option 3: Use Netlify Blobs (Advanced)
- Store PRs in Netlify's blob storage instead of GitHub
- Serve dynamically via edge functions
- No builds needed
- Cost: Requires code rewrite

### Option 4: GitHub Pages (Free Alternative)
- Move PR hosting to GitHub Pages
- PRs update without using Netlify credits
- Keep main site on Netlify
- Cost: $0 but more complex setup

## Current Impact

With `[skip ci]` in place:
- ✅ PRs are safely stored in GitHub
- ❌ PRs are NOT visible on the website
- ❌ Customers can't see their published PRs
- 🔧 Requires manual deploy to make PRs visible

## Immediate Fix Needed

### Quick Solution - Remove [skip ci]:

```javascript
// In api/save-pr-no-build.js, change:
const commitMessage = existingFile
    ? `[skip ci] Update PR: ${metadata?.company || filename}`
    : `[skip ci] Add PR: ${metadata?.company || filename}`;

// To:
const commitMessage = existingFile
    ? `Update PR: ${metadata?.company || filename}`
    : `Add PR: ${metadata?.company || filename}`;
```

### Build Credit Math:
- 1,000 credits per month
- 1 credit per PR published
- Can handle 1,000 PRs per month
- €99 per PR × 1,000 = €99,000 potential revenue
- Build cost: €9/month for Personal plan

## Recommendation

**Remove `[skip ci]` immediately** because:
1. Customers need to see their PRs instantly
2. 1,000 credits is plenty for PRs
3. Revenue per PR (€99) far exceeds cost (€0.009)
4. Customer satisfaction requires immediate visibility

Without this fix, customers will pay €99 and not see their PR published!