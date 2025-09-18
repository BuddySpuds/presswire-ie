/**
 * Stripe Webhook Handler for PressWire.ie
 * Processes payment events and triggers PR generation
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const sig = event.headers['stripe-signature'];

    // Support both test and live webhook secrets
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Webhook secret not configured' })
        };
    }

    let stripeEvent;

    try {
        // Verify webhook signature
        stripeEvent = stripe.webhooks.constructEvent(
            event.body,
            sig,
            webhookSecret
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
        };
    }

    // Handle the event
    try {
        console.log(`Received webhook event: ${stripeEvent.type}`);

        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                await handleCheckoutComplete(stripeEvent.data.object);
                break;

            case 'payment_intent.succeeded':
                await handlePaymentSuccess(stripeEvent.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailed(stripeEvent.data.object);
                break;

            case 'charge.succeeded':
            case 'charge.updated':
                // Handle charge events (from Payment Links)
                console.log('Charge event received:', stripeEvent.type);
                // Payment Links don't trigger checkout.session.completed
                // So we need to handle charge events
                if (stripeEvent.data.object.paid) {
                    console.log('Payment successful via charge event');
                    // Trigger PR generation based on charge metadata
                    // This is a fallback for Payment Links
                }
                break;

            default:
                console.log(`Unhandled event type: ${stripeEvent.type}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ received: true })
        };
    } catch (error) {
        console.error('Error processing webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Webhook processing failed' })
        };
    }
};

async function handleCheckoutComplete(session) {
    console.log('Checkout completed:', session.id);
    console.log('Session payment status:', session.payment_status);

    try {
        // Retrieve the full session with line items
        const fullSession = await stripe.checkout.sessions.retrieve(
            session.id,
            { expand: ['line_items', 'customer'] }
        );
        console.log('Full session retrieved successfully');

        // Extract metadata and customer details
        const metadata = fullSession.metadata || {};
        const customerEmail = fullSession.customer_details?.email;
        const customerName = fullSession.customer_details?.name;
        const packageType = metadata.package_type || 'starter';

        // Try to get the client_reference_id which contains our draft ID
        const clientReferenceId = fullSession.client_reference_id;
        console.log('Client reference ID:', clientReferenceId);

        // Determine credits based on package
        let credits = 1;
        if (packageType === 'bundle_pack') {
            credits = 10;
        }

        // Store payment record (in production, this would go to a database)
        const paymentRecord = {
            sessionId: session.id,
            customerId: fullSession.customer,
            email: customerEmail,
            package: packageType,
            credits: credits,
            amount: fullSession.amount_total,
            currency: fullSession.currency,
            status: 'completed',
            createdAt: new Date().toISOString()
        };

        console.log('Payment record:', paymentRecord);

        // Try to trigger PR generation
        // First check client_reference_id, then URL parameters, then metadata
        console.log('Looking for PR data - clientReferenceId:', clientReferenceId);

        let prProcessed = false;

        // Check if it's a draft ID
        if (clientReferenceId && clientReferenceId.startsWith('draft_')) {
            try {
                console.log('Retrieving draft with ID:', clientReferenceId);

                // Retrieve draft from storage
                const draftResponse = await fetch(`${process.env.URL || 'https://presswire.ie'}/api/get-pr-draft?id=${clientReferenceId}`);

                if (draftResponse.ok) {
                    const draftData = await draftResponse.json();
                    const prData = draftData.draft;

                    // Add payment information
                    prData.stripeSessionId = session.id;
                    prData.paymentAmount = fullSession.amount_total;
                    prData.currency = fullSession.currency;

                    console.log('Draft retrieved, triggering PR generation');
                    await triggerPRGeneration(prData, customerEmail, session.id);
                    prProcessed = true;

                    // Clean up draft after successful processing
                    // Note: In production, mark as used rather than delete
                } else {
                    console.error('Failed to retrieve draft');
                }
            } catch (error) {
                console.error('Error retrieving draft:', error);
            }
        } else if (clientReferenceId && clientReferenceId.startsWith('pr_')) {
            // Fallback for old format
            try {
                // Build basic PR data from what we have
                const prData = {
                    sessionId: clientReferenceId,
                    stripeSessionId: session.id,
                    email: customerEmail,
                    name: customerName,
                    package: packageType,
                    amount: fullSession.amount_total,
                    currency: fullSession.currency
                };

                console.log('Triggering PR generation for session:', clientReferenceId);
                await triggerPRGeneration(prData, customerEmail, session.id);
                prProcessed = true;
            } catch (error) {
                console.error('Error processing PR generation:', error);
            }
        }

        // Fallback: Check URL parameters from success page redirect
        if (!prProcessed && fullSession.success_url) {
            const urlParams = new URL(fullSession.success_url).searchParams;
            const sessionParam = urlParams.get('session_id');
            console.log('Checking success URL for session:', sessionParam);

            if (sessionParam && sessionParam.startsWith('pr_')) {
                try {
                    const prData = {
                        sessionId: sessionParam,
                        stripeSessionId: session.id,
                        email: customerEmail,
                        name: customerName,
                        package: packageType,
                        amount: fullSession.amount_total,
                        currency: fullSession.currency
                    };

                    console.log('Triggering PR from URL params:', sessionParam);
                    await triggerPRGeneration(prData, customerEmail, session.id);
                    prProcessed = true;
                } catch (error) {
                    console.error('Error with URL param PR generation:', error);
                }
            }
        }

        if (!prProcessed && metadata.pr_draft) {
            // Fallback to metadata if available
            try {
                const prDraft = JSON.parse(metadata.pr_draft);
                await triggerPRGeneration(prDraft, customerEmail, session.id);
            } catch (error) {
                console.error('Error processing PR draft from metadata:', error);
            }
        }

        // Send confirmation email
        await sendConfirmationEmail(customerEmail, packageType, credits);
    } catch (error) {
        console.error('Error handling checkout complete:', error);
        throw error;
    }
}

async function handlePaymentSuccess(paymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id);
    // Additional processing if needed
}

async function handlePaymentFailed(paymentIntent) {
    console.log('Payment failed:', paymentIntent.id);

    // Notify customer of failed payment
    const customerEmail = paymentIntent.receipt_email || paymentIntent.metadata?.email;
    if (customerEmail) {
        await sendPaymentFailedEmail(customerEmail);
    }
}

async function triggerPRGeneration(prDraft, email, sessionId) {
    console.log('Triggering PR generation for:', email);
    console.log('PR Draft data:', JSON.stringify(prDraft, null, 2));
    console.log('Stripe Session ID:', sessionId);

    try {
        // Generate a simple PR HTML
        const prHtml = generatePRHTML(prDraft);

        // Generate SEO-friendly filename
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        // Create slug from headline or company name
        const headlineSlug = (prDraft.headline || prDraft.title || 'announcement')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60); // Limit length

        const companySlug = (prDraft.companyName || prDraft.company || 'company')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        // Format: company-headline-YYYYMM.html
        // Falls back to timestamp if needed for uniqueness
        const timestamp = Date.now();
        const filename = `${companySlug}-${headlineSlug}-${year}${month}.html`;

        // Save the PR
        await savePRToGitHub(prHtml, filename, prDraft);

        console.log('PR generated and saved:', filename);

        // Send confirmation email
        await sendConfirmationEmail(email, 'professional', 1, `/news/${filename}`);

    } catch (error) {
        console.error('Failed to generate PR:', error);
        throw error;
    }
}

function generatePRHTML(prData) {
    const currentDate = new Date().toLocaleDateString('en-IE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Build key points HTML if available
    let keyPointsHTML = '';
    if (prData.keypoints) {
        const points = prData.keypoints.split('\n').filter(p => p.trim());
        if (points.length > 0) {
            keyPointsHTML = `
                <h2 class="text-xl font-semibold mb-3 mt-6">Key Points</h2>
                <ul class="list-disc list-inside space-y-2 text-gray-700">
                    ${points.map(point => `<li>${point.trim()}</li>`).join('')}
                </ul>
            `;
        }
    }

    // Build quote HTML if available
    let quoteHTML = '';
    if (prData.quote) {
        quoteHTML = `
            <blockquote class="border-l-4 border-green-500 pl-4 italic text-gray-700 my-6">
                "${prData.quote}"
            </blockquote>
        `;
    }

    // Build backlinks section if website provided
    let backlinksHTML = '';
    if (prData.website) {
        backlinksHTML = `
            <div class="mt-8 pt-8 border-t">
                <p class="text-gray-700 mb-2">
                    For more information, visit <a href="${prData.website}" rel="dofollow" class="text-green-600 underline hover:text-green-700">${prData.companyName || 'our website'}</a>.
                </p>
            </div>
        `;
    }

    // Build social links if provided
    let socialHTML = '';
    if (prData.socialLinks) {
        socialHTML = `
            <div class="mt-4">
                <p class="text-sm text-gray-600">
                    Follow us: ${prData.socialLinks}
                </p>
            </div>
        `;
    }

    return `<!DOCTYPE html>
<html lang="en-IE">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${prData.headline || prData.companyName + ' Press Release'} - PressWire.ie</title>
    <meta name="description" content="${prData.summary || 'Press release from ' + prData.companyName + ' published on PressWire.ie'}">
    <meta name="keywords" content="${prData.keywords || 'press release, Ireland, ' + prData.companyName}">

    <!-- Open Graph tags -->
    <meta property="og:title" content="${prData.headline || prData.companyName + ' Press Release'}">
    <meta property="og:description" content="${prData.summary || 'Latest press release from ' + prData.companyName}">
    <meta property="og:type" content="article">
    <meta property="article:published_time" content="${new Date().toISOString()}">

    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Schema.org markup -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": "${(prData.headline || '').replace(/"/g, '\\"')}",
        "datePublished": "${new Date().toISOString()}",
        "author": {
            "@type": "Organization",
            "name": "${(prData.companyName || '').replace(/"/g, '\\"')}"
        },
        "publisher": {
            "@type": "Organization",
            "name": "PressWire.ie"
        }
    }
    </script>
</head>
<body class="bg-gray-50">
    <div class="max-w-4xl mx-auto px-6 py-12">
        <div class="bg-white rounded-lg shadow-sm p-8">
            <div class="mb-6">
                <span class="text-sm text-gray-500">Press Release</span>
                <span class="mx-2 text-gray-400">•</span>
                <span class="text-sm text-gray-500">${currentDate}</span>
                ${prData.industry ? `<span class="mx-2 text-gray-400">•</span>
                <span class="text-sm text-gray-500">${prData.industry}</span>` : ''}
            </div>

            <h1 class="text-3xl font-bold mb-6">${prData.headline || prData.companyName + ' Announcement'}</h1>

            <div class="prose max-w-none">
                <p class="text-lg text-gray-700 mb-4 font-medium">
                    ${prData.summary || prData.companyName + ' today announced a significant development.'}
                </p>

                ${keyPointsHTML}
                ${quoteHTML}

                ${backlinksHTML}

                <div class="mt-8 pt-8 border-t">
                    <h3 class="font-semibold mb-2">Contact Information</h3>
                    <p class="text-sm text-gray-600">
                        ${prData.contact || prData.companyEmail || 'Contact information not provided'}<br>
                        ${prData.companyName}<br>
                        ${prData.croNumber ? `CRO Number: ${prData.croNumber}<br>` : ''}
                        ${prData.companyEmail}
                    </p>
                    ${socialHTML}
                </div>

                <div class="mt-4 text-xs text-gray-400">
                    <p>Published via PressWire.ie • Domain Verified • Transaction ID: ${prData.stripeSessionId || 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="mt-8 text-center">
            <a href="/" class="text-sm text-gray-500 hover:text-gray-700">
                ← Back to PressWire.ie
            </a>
        </div>
    </div>
</body>
</html>`;
}

async function savePRToGitHub(content, filename, metadata) {
    // Check if GitHub is configured
    if (!process.env.GITHUB_TOKEN) {
        console.log('GitHub not configured, skipping PR save');
        return;
    }

    try {
        const { Octokit } = require('@octokit/rest');
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        const response = await octokit.repos.createOrUpdateFileContents({
            owner: process.env.GITHUB_OWNER || 'BuddySpuds',
            repo: process.env.GITHUB_REPO || 'presswire-ie',
            path: `news/${filename}`,
            message: `Add press release: ${metadata.name || filename}`,
            content: Buffer.from(content).toString('base64')
        });

        console.log('PR saved to GitHub:', response.data.commit.sha);
    } catch (error) {
        console.error('Failed to save to GitHub:', error.message);
    }
}

async function sendConfirmationEmail(email, packageType, credits, prUrl) {
    console.log(`Sending confirmation email to ${email}`);
    console.log(`Package: ${packageType}, Credits: ${credits}`);
    console.log(`PR URL: ${prUrl}`);

    // Try to send via Resend if configured
    if (process.env.SMTP_HOST && process.env.SMTP_PASS) {
        try {
            const nodemailer = require('nodemailer');

            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER || 'resend',
                    pass: process.env.SMTP_PASS
                }
            });

            const mailOptions = {
                from: 'PressWire.ie <noreply@presswire.ie>',
                to: email,
                subject: 'Your Press Release is Live! 🎉',
                html: `
                    <h2>Your press release has been published!</h2>
                    <p>Thank you for using PressWire.ie. Your press release is now live.</p>
                    <p><strong>View your press release:</strong> <a href="https://presswire.ie${prUrl}">https://presswire.ie${prUrl}</a></p>
                    <p>It will be indexed by search engines within the next few hours.</p>
                    <br>
                    <p>Best regards,<br>The PressWire.ie Team</p>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log('Confirmation email sent successfully');
        } catch (error) {
            console.error('Failed to send email:', error.message);
        }
    } else {
        console.log('Email service not configured');
    }
}

async function sendPaymentFailedEmail(email) {
    console.log(`Sending payment failed notification to ${email}`);
    // Email implementation here
}