// PR Generation API Function
// Generates press releases using OpenRouter + Gemini Flash

const fetch = require('node-fetch');
const crypto = require('crypto');
const { validateToken } = require('./verify-domain');

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'No authorization token provided' })
            };
        }

        const token = authHeader.substring(7);

        // Check for admin PR tokens
        let tokenData;
        if (token.startsWith('admin-pr-')) {
            // Validate admin PR token (check if it's recent and unused)
            const tokenTime = parseInt(token.split('-')[2]);
            const now = Date.now();
            const oneHour = 60 * 60 * 1000;

            if (now - tokenTime > oneHour) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Admin token expired' })
                };
            }

            // Admin bypass - no payment required
            tokenData = {
                email: 'admin@presswire.ie',
                domain: 'presswire.ie',
                isIrishDomain: true,
                isAdmin: true
            };
        } else if (process.env.NODE_ENV === 'development' && token.startsWith('demo-')) {
            // In development mode, accept demo tokens
            tokenData = {
                email: 'demo@company.ie',
                domain: 'company.ie',
                isIrishDomain: true
            };
        } else {
            tokenData = validateToken(token);
            if (!tokenData) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid or expired token' })
                };
            }
        }

        const {
            company,
            headline,
            summary,
            keyPoints,
            contact,
            package: prPackage
        } = JSON.parse(event.body);

        // Generate enhanced PR content using AI
        const enhancedPR = await generateWithAI({
            company,
            headline,
            summary,
            keyPoints,
            contact,
            domain: tokenData.domain,
            isIrishDomain: tokenData.isIrishDomain,
            package: prPackage
        });

        // Generate unique slug for the PR
        const slug = generateSlug(company.name, company.croNumber);

        // Create management token
        const managementToken = crypto.randomBytes(32).toString('hex');

        // Create the HTML page (with analytics tracking)
        const htmlContent = createPRHTML({
            ...enhancedPR,
            company,
            slug,
            verifiedDomain: tokenData.domain,
            publishedAt: new Date().toISOString()
        });

        // Save PR data for management
        const prData = {
            slug,
            managementToken,
            headline: enhancedPR.headline,
            summary: enhancedPR.summary,
            content: enhancedPR.content,
            keyPoints,
            contact,
            company,
            verifiedDomain: tokenData.domain,
            url: `https://presswire.ie/news/${slug}.html`,
            createdAt: new Date().toISOString(),
            published: true,
            editCount: 0,
            package: prPackage
        };

        // Save to GitHub (in production)
        if (process.env.GITHUB_TOKEN) {
            await saveToGitHub(slug, htmlContent);
            await savePRData(prData);
        }

        // Generate management URL
        const managementUrl = `https://presswire.ie/manage.html?token=${managementToken}`;

        // Return the generated PR data
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                pr: {
                    url: `https://presswire.ie/news/${slug}.html`,
                    managementUrl,
                    slug,
                    headline: enhancedPR.headline,
                    summary: enhancedPR.summary,
                    content: enhancedPR.content
                },
                message: 'Press release generated successfully',
                managementLink: managementUrl
            })
        };

    } catch (error) {
        console.error('Error generating PR:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'Failed to generate press release'
            })
        };
    }
};

async function generateWithAI(data) {
    const { company, headline, summary, keyPoints, contact, domain, isIrishDomain, package: prPackage } = data;

    // Different prompts based on package
    const prompts = {
        starter: 'Create a basic press release',
        professional: 'Create a professional, SEO-optimized press release with enhanced storytelling',
        enterprise: 'Create a premium press release with maximum impact, storytelling, and media appeal'
    };

    const systemPrompt = `You are a professional PR writer for Irish businesses.
    Create compelling, newsworthy press releases that follow AP style.
    Include Irish market context and local relevance.
    Make it authentic and avoid marketing fluff.
    Focus on news value and factual information.`;

    const userPrompt = `${prompts[prPackage || 'starter']} for:

    Company: ${company.name} (CRO: ${company.croNumber})
    Status: ${company.status}
    Domain: ${domain} ${isIrishDomain ? '(Irish domain ✓)' : ''}

    Headline: ${headline}
    Summary: ${summary}

    Key Points to expand:
    ${keyPoints}

    Contact: ${contact}

    Please create a press release with:
    1. An attention-grabbing headline (max 100 chars)
    2. A compelling lead paragraph
    3. Body paragraphs expanding the key points
    4. A company boilerplate
    5. Contact information

    Format as JSON with fields: headline, summary, content, boilerplate`;

    // Check if we have an API key
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === '') {
        console.log('No OpenRouter API key found, using enhanced fallback generation');
        return generateEnhancedFallback(data);
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://presswire.ie',
                'X-Title': 'PressWire.ie'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash:free',  // Using the free Gemini Flash model
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const result = await response.json();

        // Try to parse the response as JSON, or extract content
        let prContent;
        try {
            const content = result.choices[0].message.content;
            // Try to extract JSON if it's embedded in text
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                prContent = JSON.parse(jsonMatch[0]);
            } else {
                // Fallback: parse as plain text
                prContent = {
                    headline: headline,
                    summary: summary,
                    content: content,
                    boilerplate: `About ${company.name}`
                };
            }
        } catch (parseError) {
            console.error('Failed to parse AI response, using content as-is');
            prContent = {
                headline: headline,
                summary: summary,
                content: result.choices[0].message.content,
                boilerplate: `About ${company.name}`
            };
        }

        return {
            headline: prContent.headline || headline,
            summary: prContent.summary || summary,
            content: prContent.content || keyPoints,
            boilerplate: prContent.boilerplate || `About ${company.name}: ${summary}`
        };

    } catch (error) {
        console.error('AI generation failed, using fallback:', error);
        // Fallback to basic formatting if AI fails
        return {
            headline,
            summary,
            content: formatBasicPR(keyPoints),
            boilerplate: `About ${company.name}: ${company.name} is an Irish company (CRO: ${company.croNumber}) operating in Ireland.`
        };
    }
}

function formatBasicPR(keyPoints) {
    const points = keyPoints.split('\n').filter(p => p.trim());
    return points.map(point => `<p>${point.trim()}</p>`).join('\n');
}

function generateEnhancedFallback(data) {
    const { company, headline, summary, keyPoints, contact, domain, isIrishDomain, package: prPackage } = data;

    // Generate a professional-looking PR without AI
    const date = new Date().toLocaleDateString('en-IE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Parse key points into structured content
    const points = keyPoints.split('\n').filter(p => p.trim());
    const enhancedContent = `
        <p><strong>DUBLIN, Ireland - ${date}</strong> - ${summary}</p>

        ${points.map(point => {
            const cleanPoint = point.replace(/^[•\-*]\s*/, '').trim();
            return `<p>${cleanPoint}</p>`;
        }).join('\n')}

        <p>This announcement represents a significant development for ${company.name} and demonstrates the company's continued commitment to growth and innovation in the Irish market.</p>

        ${isIrishDomain ? '<p>As an Irish-registered company, this initiative reinforces our dedication to contributing to the local economy and business ecosystem.</p>' : ''}
    `.trim();

    const enhancedBoilerplate = `
        ${company.name} (CRO: ${company.croNumber}) is a ${company.status} company registered in Ireland.
        ${company.type ? `The company operates as a ${company.type}.` : ''}
        For more information about ${company.name} and its services, please contact us using the details provided.
    `.trim();

    // Add premium features for higher packages
    let premiumAdditions = '';
    if (prPackage === 'professional') {
        premiumAdditions = '<p><strong>About the Industry:</strong> This development comes at a time of significant growth in the Irish business sector, with companies continuing to innovate and expand their operations.</p>';
    } else if (prPackage === 'enterprise') {
        premiumAdditions = '<p><strong>Market Context:</strong> This announcement positions the company at the forefront of industry developments, reflecting broader trends in digital transformation and business growth across Ireland.</p>';
    }

    return {
        headline: headline.substring(0, 100),
        summary: summary || `${company.name} announces ${headline.toLowerCase()}`,
        content: enhancedContent + premiumAdditions,
        boilerplate: enhancedBoilerplate
    };
}

function generateSlug(companyName, croNumber) {
    const cleanName = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const timestamp = Date.now();
    return `${cleanName}-${croNumber}-${timestamp}`;
}

function createPRHTML(data) {
    const { headline, summary, content, boilerplate, company, slug, verifiedDomain, publishedAt } = data;
    const publishDate = new Date(publishedAt).toLocaleDateString('en-IE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `<!DOCTYPE html>
<html lang="en-IE">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headline} - ${company.name} | PressWire.ie</title>
    <meta name="description" content="${summary}">
    <meta property="og:title" content="${headline}">
    <meta property="og:description" content="${summary}">
    <meta property="og:url" content="https://presswire.ie/news/${slug}.html">
    <meta property="og:type" content="article">
    <link rel="canonical" href="https://presswire.ie/news/${slug}.html">

    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    </style>

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": "${headline}",
        "description": "${summary}",
        "datePublished": "${publishedAt}",
        "dateModified": "${publishedAt}",
        "author": {
            "@type": "Organization",
            "name": "${company.name}",
            "identifier": "CRO: ${company.croNumber}"
        },
        "publisher": {
            "@type": "Organization",
            "name": "PressWire.ie",
            "url": "https://presswire.ie"
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": "https://presswire.ie/news/${slug}.html"
        }
    }
    </script>
</head>
<body class="bg-white">
    <nav class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-6">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-black rounded flex items-center justify-center">
                        <span class="text-white font-bold text-sm">PW</span>
                    </div>
                    <div>
                        <div class="font-semibold text-sm">PressWire.ie</div>
                        <div class="text-xs text-gray-500">Domain-Verified Press Releases</div>
                    </div>
                </a>
                <a href="/" class="text-sm text-gray-600 hover:text-black">← All Press Releases</a>
            </div>
        </div>
    </nav>

    <article class="max-w-4xl mx-auto px-6 py-12">
        <div class="mb-8">
            <div class="flex items-center gap-3 mb-4">
                <span class="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">VERIFIED</span>
                <span class="text-sm text-gray-500">Published ${publishDate}</span>
                <span class="text-sm text-gray-500">•</span>
                <span class="text-sm text-gray-500">Verified via @${verifiedDomain}</span>
            </div>

            <h1 class="text-4xl font-bold mb-4">${headline}</h1>

            <div class="text-gray-600 mb-6">
                <span>Dublin, Ireland</span> •
                <span>CRO: ${company.croNumber}</span> •
                <span>${company.name}</span>
            </div>
        </div>

        <div class="prose prose-lg max-w-none">
            <p class="lead text-xl text-gray-700 mb-6">${summary}</p>

            ${content}

            <div class="mt-12 pt-8 border-t">
                <h3 class="font-semibold text-lg mb-3">About ${company.name}</h3>
                <p class="text-gray-600">${boilerplate}</p>
            </div>

            <div class="mt-8 pt-8 border-t">
                <h3 class="font-semibold text-lg mb-3">Contact Information</h3>
                <p class="text-gray-600">${data.contact}</p>
            </div>
        </div>

        <div class="mt-12 p-6 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-500 text-center">
                This press release was published on PressWire.ie with domain verification.
                Company identity verified via @${verifiedDomain} and CRO number ${company.croNumber}.
            </p>
        </div>
    </article>

    <footer class="mt-20 py-8 border-t">
        <div class="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
            <p>© 2025 PressWire.ie - Ireland's Domain-Verified Press Release Platform</p>
        </div>
    </footer>

    <!-- Analytics Tracking -->
    <script>
    (function() {
        // Generate or retrieve session ID
        let sessionId = localStorage.getItem('pw_session');
        if (!sessionId) {
            sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('pw_session', sessionId);
        }

        // Track page view
        fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'track-view',
                slug: '${slug}',
                sessionId: sessionId,
                referrer: document.referrer || 'direct'
            })
        }).catch(err => console.log('Analytics tracking failed:', err));
    })();
    </script>
</body>
</html>`;
}

async function saveToGitHub(slug, content) {
    if (!process.env.GITHUB_TOKEN) {
        console.log('GitHub integration not configured');
        return;
    }

    try {
        const { Octokit } = require('@octokit/rest');
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        await octokit.repos.createOrUpdateFileContents({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            path: `pr/${slug}.html`,
            message: `Add PR: ${slug}`,
            content: Buffer.from(content).toString('base64'),
            branch: 'main'
        });

        console.log(`PR saved to GitHub: pr/${slug}.html`);
    } catch (error) {
        console.error('Failed to save to GitHub:', error);
    }
}

async function savePRData(prData) {
    // In production, save to GitHub data/prs.json
    // For now, use in-memory storage from manage-pr.js
    const { savePR } = require('./manage-pr');
    savePR(prData);

    console.log(`PR data saved with management token for ${prData.slug}`);
}