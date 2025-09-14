// Admin API Endpoint
// Provides admin authentication and management functions

const crypto = require('crypto');

// In-memory storage for tokens (in production, use a database)
let discountTokens = [];

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
        // Check admin authentication
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'No authorization token provided' })
            };
        }

        const token = authHeader.substring(7);

        // Verify admin token (set in environment variables)
        const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret-2025-presswire';

        if (token !== ADMIN_TOKEN) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Invalid admin token' })
            };
        }

        const { action, data } = JSON.parse(event.body || '{}');

        switch (action) {
            case 'generate-discount':
                return handleGenerateDiscount(data, headers);

            case 'list-tokens':
                return handleListTokens(headers);

            case 'revoke-token':
                return handleRevokeToken(data, headers);

            case 'get-stats':
                return handleGetStats(headers);

            case 'generate-admin-pr-token':
                return handleGenerateAdminPRToken(headers);

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }

    } catch (error) {
        console.error('Admin API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

function handleGenerateDiscount(data, headers) {
    const {
        discountPercent = 10,
        validDays = 30,
        maxUses = 1,
        description = ''
    } = data || {};

    // Validate discount percentage
    if (![10, 25, 50, 100].includes(discountPercent)) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: 'Invalid discount percentage. Must be 10, 25, 50, or 100'
            })
        };
    }

    // Generate unique token
    const tokenCode = generateTokenCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDays);

    const token = {
        code: tokenCode,
        discountPercent,
        maxUses,
        usedCount: 0,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        description,
        active: true
    };

    // Store token
    discountTokens.push(token);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            token: {
                code: tokenCode,
                discountPercent,
                expiresAt: expiresAt.toISOString(),
                maxUses,
                description
            },
            message: `Discount token created: ${tokenCode} (${discountPercent}% off)`
        })
    };
}

function handleListTokens(headers) {
    // Filter out expired tokens
    const now = new Date();
    const activeTokens = discountTokens.filter(token => {
        const expiryDate = new Date(token.expiresAt);
        return token.active && expiryDate > now;
    });

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            tokens: activeTokens.map(token => ({
                code: token.code,
                discountPercent: token.discountPercent,
                usedCount: token.usedCount,
                maxUses: token.maxUses,
                expiresAt: token.expiresAt,
                description: token.description,
                remainingUses: token.maxUses - token.usedCount
            })),
            total: activeTokens.length
        })
    };
}

function handleRevokeToken(data, headers) {
    const { code } = data || {};

    if (!code) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Token code required' })
        };
    }

    const token = discountTokens.find(t => t.code === code);
    if (!token) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Token not found' })
        };
    }

    token.active = false;

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: `Token ${code} has been revoked`
        })
    };
}

function handleGetStats(headers) {
    const now = new Date();
    const activeTokens = discountTokens.filter(t => t.active && new Date(t.expiresAt) > now);
    const usedTokens = discountTokens.filter(t => t.usedCount > 0);
    const expiredTokens = discountTokens.filter(t => new Date(t.expiresAt) <= now);

    // Calculate total discount value given
    const totalDiscountValue = discountTokens.reduce((sum, token) => {
        const basePrice = 199; // Average price
        const discountAmount = (basePrice * token.discountPercent / 100) * token.usedCount;
        return sum + discountAmount;
    }, 0);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            stats: {
                totalTokensCreated: discountTokens.length,
                activeTokens: activeTokens.length,
                usedTokens: usedTokens.length,
                expiredTokens: expiredTokens.length,
                totalDiscountValue: `€${totalDiscountValue.toFixed(2)}`,
                tokensByDiscount: {
                    '10%': discountTokens.filter(t => t.discountPercent === 10).length,
                    '25%': discountTokens.filter(t => t.discountPercent === 25).length,
                    '50%': discountTokens.filter(t => t.discountPercent === 50).length,
                    '100%': discountTokens.filter(t => t.discountPercent === 100).length
                }
            }
        })
    };
}

function handleGenerateAdminPRToken(headers) {
    // Generate a special token that bypasses payment for PR generation
    const token = `admin-pr-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            token,
            message: 'Admin PR token generated. Valid for single use.',
            expiresIn: '1 hour'
        })
    };
}

function generateTokenCode() {
    // Generate readable discount code (e.g., SAVE25-XXXX)
    const prefix = ['SAVE', 'DEAL', 'PROMO', 'PRESS'][Math.floor(Math.random() * 4)];
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${suffix}`;
}

// Export helper function for token validation (used by other endpoints)
exports.validateDiscountToken = (code) => {
    const token = discountTokens.find(t => t.code === code);

    if (!token || !token.active) {
        return { valid: false, error: 'Invalid or inactive token' };
    }

    const now = new Date();
    const expiryDate = new Date(token.expiresAt);

    if (expiryDate <= now) {
        return { valid: false, error: 'Token has expired' };
    }

    if (token.usedCount >= token.maxUses) {
        return { valid: false, error: 'Token has reached maximum uses' };
    }

    return {
        valid: true,
        discountPercent: token.discountPercent,
        token
    };
};

// Export helper to mark token as used
exports.useDiscountToken = (code) => {
    const token = discountTokens.find(t => t.code === code);
    if (token) {
        token.usedCount++;
        return true;
    }
    return false;
};