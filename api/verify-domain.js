// Domain Verification API Function
// Validates email domain ownership and sends verification codes

const dns = require('dns').promises;
const crypto = require('crypto');

// In-memory store for demo (use Redis/database in production)
const verificationCodes = new Map();
const verificationTokens = new Map();

// Free email providers to block
const FREE_EMAIL_PROVIDERS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'aol.com', 'icloud.com', 'protonmail.com', 'yandex.com', 'mail.com',
    'gmx.com', 'zoho.com', 'fastmail.com', 'tutanota.com'
];

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { action, email, code } = JSON.parse(event.body);

        if (action === 'send-code') {
            return await sendVerificationCode(email, headers);
        } else if (action === 'verify-code') {
            return await verifyCode(email, code, headers);
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action' })
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

async function sendVerificationCode(email, headers) {
    // Validate email format
    if (!email || !email.includes('@')) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid email address' })
        };
    }

    const domain = email.split('@')[1].toLowerCase();

    // Check if it's a free email provider
    if (FREE_EMAIL_PROVIDERS.includes(domain)) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
                error: 'Free email providers not allowed',
                message: 'Please use your company email address'
            })
        };
    }

    // Check if domain ends with .ie (Irish domain)
    const isIrishDomain = domain.endsWith('.ie');

    // Verify domain has MX records (can receive email)
    // For demo/testing, we'll accept .ie domains without full MX check
    if (process.env.NODE_ENV === 'development' && domain.endsWith('.ie')) {
        console.log(`Development mode: Accepting .ie domain ${domain} without MX check`);
    } else {
        try {
            const mxRecords = await dns.resolveMx(domain);
            if (!mxRecords || mxRecords.length === 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Invalid domain',
                        message: 'Domain cannot receive emails'
                    })
                };
            }
        } catch (error) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Domain verification failed',
                    message: 'Could not verify domain email configuration'
                })
            };
        }
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code with 10-minute expiry
    verificationCodes.set(email, {
        code,
        expires: Date.now() + 10 * 60 * 1000,
        domain,
        isIrishDomain
    });

    // In production, send actual email here using SendGrid/AWS SES
    // For demo, we'll just return success
    console.log(`Verification code for ${email}: ${code}`);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Verification code sent',
            domain,
            isIrishDomain,
            // For demo only - remove in production!
            demoCode: code
        })
    };
}

async function verifyCode(email, code, headers) {
    const stored = verificationCodes.get(email);

    if (!stored) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No verification code found' })
        };
    }

    if (Date.now() > stored.expires) {
        verificationCodes.delete(email);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Verification code expired' })
        };
    }

    if (stored.code !== code) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid verification code' })
        };
    }

    // Generate secure token for publishing
    const token = crypto.randomBytes(32).toString('hex');

    // Store token with 1-hour expiry
    verificationTokens.set(token, {
        email,
        domain: stored.domain,
        isIrishDomain: stored.isIrishDomain,
        expires: Date.now() + 60 * 60 * 1000
    });

    // Clean up used code
    verificationCodes.delete(email);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            token,
            domain: stored.domain,
            isIrishDomain: stored.isIrishDomain,
            message: 'Domain verified successfully'
        })
    };
}

// Helper function to validate token (used by other APIs)
function validateToken(token) {
    const stored = verificationTokens.get(token);

    if (!stored) {
        return null;
    }

    if (Date.now() > stored.expires) {
        verificationTokens.delete(token);
        return null;
    }

    return stored;
}

module.exports.validateToken = validateToken;