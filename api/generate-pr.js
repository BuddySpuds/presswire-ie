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

        // Check for various token types
        let tokenData;

        // Payment-verified tokens (from Stripe success)
        if (token.startsWith('payment-verified-')) {
            // These tokens are created after successful Stripe payment
            const tokenTime = parseInt(token.split('-')[2]);
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000; // Valid for 5 minutes after payment

            if (now - tokenTime > fiveMinutes) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Payment verification expired' })
                };
            }

            // Extract email from request body since payment doesn't have domain verification
            const requestBody = JSON.parse(event.body);
            tokenData = {
                email: requestBody.email || 'customer@presswire.ie',
                domain: 'presswire.ie',
                isIrishDomain: true,
                isPaymentVerified: true
            };
        }
        // Admin PR tokens
        else if (token.startsWith('admin-pr-')) {
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

        // Generate SEO-friendly slug for the PR
        const slug = generateSlug(enhancedPR.headline || data.headline, company.croNumber);

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
        try {
            await saveToGitHub(slug, htmlContent);
            await savePRData(prData);
            console.log(`PR successfully saved: ${slug}`);
        } catch (githubError) {
            console.error('GitHub save failed:', githubError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Failed to save press release',
                    message: 'The press release was generated but could not be saved. Please contact support.',
                    details: process.env.NODE_ENV === 'development' ? githubError.message : undefined
                })
            };
        }

        // Send email notification after PR is saved
        try {
            await sendEmailNotification({
                email: tokenData.email,
                prUrl: `/news/${slug}.html`,
                headline: enhancedPR.headline,
                company: company.name
            });
            console.log(`Email notification sent to ${tokenData.email}`);
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
            // Don't fail the whole request if email fails
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

function generateSlug(headline, croNumber) {
    // Create SEO-friendly slug from headline
    const cleanSlug = headline
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50); // Limit length for readability

    // Add CRO number for uniqueness (no timestamp for clean URLs)
    return `${cleanSlug}-${croNumber}`;
}

function createPRHTML(data) {
    const { headline, summary, content, boilerplate, company, slug, verifiedDomain, publishedAt } = data;
    const publishDate = new Date(publishedAt).toLocaleDateString('en-IE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Generate keywords from headline and content
    const keywords = [
        'Irish Business',
        company.name,
        ...headline.split(' ').filter(w => w.length > 4).slice(0, 3),
        'Press Release',
        'Ireland'
    ].join(', ');

    // Determine category tags based on content
    const categories = [];
    const contentLower = (content + ' ' + headline).toLowerCase();
    if (contentLower.includes('product') || contentLower.includes('launch')) {
        categories.push('Product Launch');
    }
    if (contentLower.includes('funding') || contentLower.includes('investment') || contentLower.includes('series')) {
        categories.push('Funding');
    }
    if (contentLower.includes('partnership') || contentLower.includes('collaboration')) {
        categories.push('Partnership');
    }
    if (contentLower.includes('award') || contentLower.includes('recognition')) {
        categories.push('Awards');
    }
    if (contentLower.includes('garden') || contentLower.includes('plant')) {
        categories.push('Gardening');
    }
    if (categories.length === 0) {
        categories.push('Company News');
    }

    return `<!DOCTYPE html>
<html lang="en-IE">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headline} - ${company.name} | PressWire.ie</title>
    <meta name="description" content="${summary}">
    <meta name="keywords" content="${keywords}">
    <link rel="canonical" href="https://presswire.ie/news/${slug}.html">

    <!-- Open Graph -->
    <meta property="og:title" content="${headline}">
    <meta property="og:description" content="${summary}">
    <meta property="og:url" content="https://presswire.ie/news/${slug}.html">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="PressWire.ie">
    <meta property="article:published_time" content="${new Date(publishedAt).toISOString()}">
    <meta property="article:author" content="${company.name}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${headline}">
    <meta name="twitter:description" content="${summary}">
    <meta name="twitter:site" content="@presswire_ie">

    <!-- Schema.org -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": "${headline}",
        "description": "${summary}",
        "datePublished": "${new Date(publishedAt).toISOString()}",
        "dateModified": "${new Date(publishedAt).toISOString()}",
        "author": {
            "@type": "Organization",
            "name": "${company.name}",
            "identifier": "CRO: ${company.croNumber}"
        },
        "publisher": {
            "@type": "Organization",
            "name": "PressWire.ie",
            "url": "https://presswire.ie",
            "logo": {
                "@type": "ImageObject",
                "url": "https://presswire.ie/logo.png"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": "https://presswire.ie/news/${slug}.html"
        }
    }
    </script>

    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { font-family: 'Inter', sans-serif; }
        .share-button {
            transition: all 0.2s ease;
        }
        .share-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        @media print {
            .no-print { display: none !important; }
            body { background: white; }
            .bg-white { box-shadow: none !important; }
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <nav class="bg-white border-b sticky top-0 z-10 no-print">
        <div class="max-w-7xl mx-auto px-6">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                        <span class="text-white font-bold text-sm">PW</span>
                    </div>
                    <span class="font-semibold">PressWire.ie</span>
                </a>
                <div class="flex items-center gap-4">
                    <span class="text-xs text-green-600 font-medium">✓ Verified Press Release</span>
                    <a href="/" class="text-sm text-gray-500 hover:text-gray-700">← Back</a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <article class="max-w-4xl mx-auto px-6 py-12">
        <div class="bg-white rounded-lg shadow-sm p-8">
            <!-- Category Tags -->
            <div class="flex flex-wrap gap-2 mb-6">
                <span class="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">✓ Verified</span>
                ${categories.map(cat => `<span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">${cat}</span>`).join('')}
                <span class="text-sm text-gray-500">${publishDate}</span>
            </div>

            <!-- Headline -->
            <h1 class="text-3xl md:text-4xl font-bold mb-4">${headline}</h1>

            <!-- Meta Information -->
            <div class="flex flex-wrap gap-2 text-gray-600 mb-6">
                <span>Dublin, Ireland</span>
                <span>•</span>
                <span>CRO: ${company.croNumber}</span>
                <span>•</span>
                <span class="font-medium">${company.name}</span>
                <span>•</span>
                <span>Verified via @${verifiedDomain}</span>
            </div>

            <!-- Share Buttons -->
            <div class="flex flex-wrap gap-3 mb-8 no-print">
                <button onclick="shareOnLinkedIn()" class="share-button px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    Share on LinkedIn
                </button>
                <button onclick="shareOnTwitter()" class="share-button px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    Share on X
                </button>
                <button onclick="copyLink()" class="share-button px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    <span id="copyText">Copy Link</span>
                </button>
                <button onclick="window.print()" class="share-button px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Download PDF
                </button>
            </div>

            <!-- Content -->
            <div class="prose prose-lg max-w-none">
                <p class="lead text-xl text-gray-700 mb-6">${summary}</p>

                <div class="text-gray-800 leading-relaxed">
                    ${content}
                </div>

                <!-- About Company Section -->
                <div class="mt-12 pt-8 border-t">
                    <h3 class="font-semibold text-lg mb-3">About ${company.name}</h3>
                    <p class="text-gray-600">${boilerplate}</p>
                </div>

                <!-- Contact Section -->
                <div class="mt-8 pt-8 border-t">
                    <h3 class="font-semibold text-lg mb-3">Contact Information</h3>
                    <p class="text-gray-600">${data.contact || 'Contact information not provided'}</p>
                </div>
            </div>
        </div>

        <!-- Verification Badge -->
        <div class="mt-8 p-6 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-center gap-2 text-sm text-gray-600">
                <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <p>This press release was published on PressWire.ie with domain verification.</p>
            </div>
            <p class="text-center text-sm text-gray-500 mt-2">
                Company identity verified via @${verifiedDomain} and CRO number ${company.croNumber}
            </p>
        </div>
    </article>

    <!-- Footer -->
    <footer class="mt-20 py-8 border-t no-print">
        <div class="max-w-7xl mx-auto px-6 text-center">
            <p class="text-sm text-gray-500 mb-2">© 2025 PressWire.ie - Ireland's Domain-Verified Press Release Platform</p>
            <p class="text-xs text-gray-400">Building trust through verification</p>
        </div>
    </footer>

    <!-- Scripts -->
    <script>
    // Share functions
    function shareOnLinkedIn() {
        const url = encodeURIComponent(window.location.href);
        window.open(\`https://www.linkedin.com/sharing/share-offsite/?url=\${url}\`, '_blank', 'width=600,height=600');
    }

    function shareOnTwitter() {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent('${headline} via @presswire_ie');
        window.open(\`https://twitter.com/intent/tweet?url=\${url}&text=\${text}\`, '_blank', 'width=600,height=400');
    }

    function copyLink() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            document.getElementById('copyText').textContent = 'Copied!';
            setTimeout(() => {
                document.getElementById('copyText').textContent = 'Copy Link';
            }, 2000);
        });
    }

    // Analytics tracking
    (function() {
        let sessionId = localStorage.getItem('pw_session');
        if (!sessionId) {
            sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('pw_session', sessionId);
        }

        fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'track-view',
                slug: '${slug}',
                sessionId: sessionId,
                referrer: document.referrer || 'direct'
            })
        }).catch(() => {});
    })();
    </script>
</body>
</html>`;
}

async function saveToGitHub(slug, content) {
    if (!process.env.GITHUB_TOKEN) {
        console.error('GitHub integration not configured - GITHUB_TOKEN missing');
        throw new Error('GitHub integration not configured');
    }

    if (!process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
        console.error('GitHub config incomplete:', {
            owner: process.env.GITHUB_OWNER || 'missing',
            repo: process.env.GITHUB_REPO || 'missing'
        });
        throw new Error('GitHub configuration incomplete');
    }

    try {
        const { Octokit } = require('@octokit/rest');
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        const result = await octokit.repos.createOrUpdateFileContents({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            path: `news/${slug}.html`,
            message: `Add PR: ${slug}`,
            content: Buffer.from(content).toString('base64'),
            branch: 'main'
        });

        console.log(`PR saved to GitHub: news/${slug}.html`, result.data.commit.sha);
        return result.data;
    } catch (error) {
        console.error('Failed to save to GitHub:', {
            error: error.message,
            status: error.status,
            slug: slug,
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO
        });
        throw error; // Re-throw to stop the process
    }
}

async function savePRData(prData) {
    // In production, save to GitHub data/prs.json
    // For now, use in-memory storage from manage-pr.js
    const { savePR } = require('./manage-pr');
    savePR(prData);

    console.log(`PR data saved with management token for ${prData.slug}`);
}

async function sendEmailNotification(data) {
    const { email, prUrl, headline, company } = data;

    try {
        const fetch = require('node-fetch');
        const response = await fetch('https://presswire.ie/api/send-pr-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                prUrl,
                headline,
                company
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Email API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Email notification error:', error);
        throw error;
    }
}