/**
 * Validate Discount Codes
 * Public endpoint for checking discount codes without admin auth
 */

// Discount codes configuration
// In production, store these in environment variables or database
const DISCOUNT_CODES = {
    // Launch discount codes
    'LAUNCH50': {
        discountPercent: 50,
        description: 'Launch discount - 50% off',
        validUntil: new Date('2025-12-31'),
        usageLimit: 100,
        usageCount: 0
    },
    'EARLY30': {
        discountPercent: 30,
        description: 'Early bird - 30% off',
        validUntil: new Date('2025-10-31'),
        usageLimit: 50,
        usageCount: 0
    },
    'FRIEND20': {
        discountPercent: 20,
        description: 'Friends & Family - 20% off',
        validUntil: new Date('2026-12-31'),
        usageLimit: null, // Unlimited
        usageCount: 0
    },
    'STARTUP25': {
        discountPercent: 25,
        description: 'Startup discount - 25% off',
        validUntil: new Date('2025-12-31'),
        usageLimit: 200,
        usageCount: 0
    }
};

// Track usage in memory (use database in production)
const codeUsage = new Map();

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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { code } = JSON.parse(event.body || '{}');

        if (!code) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    valid: false,
                    error: 'No discount code provided'
                })
            };
        }

        // Convert to uppercase for consistency
        const upperCode = code.toUpperCase();

        // Check if code exists
        const discount = DISCOUNT_CODES[upperCode];

        if (!discount) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: false,
                    error: 'Invalid discount code'
                })
            };
        }

        // Check if code has expired
        if (discount.validUntil && new Date() > discount.validUntil) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: false,
                    error: 'This discount code has expired'
                })
            };
        }

        // Check usage limit
        if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: false,
                    error: 'This discount code has reached its usage limit'
                })
            };
        }

        // Code is valid!
        // Note: We don't increment usage here, only when payment completes
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                valid: true,
                discount: {
                    code: upperCode,
                    discountPercent: discount.discountPercent,
                    description: discount.description
                },
                message: `${discount.description} applied successfully!`
            })
        };

    } catch (error) {
        console.error('Error validating discount:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                valid: false,
                error: 'Error validating discount code'
            })
        };
    }
};

// Export for use in other functions
exports.DISCOUNT_CODES = DISCOUNT_CODES;