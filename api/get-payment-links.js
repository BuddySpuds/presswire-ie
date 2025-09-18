/**
 * Get Payment Links API
 * Returns Stripe payment links from environment variables
 */

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
        // Get payment links from environment variables
        const links = {
            launch: process.env.STRIPE_PAYMENT_LINK_BASIC || 'https://buy.stripe.com/test_default',
            bundle: process.env.STRIPE_PAYMENT_LINK_PROFESSIONAL || 'https://buy.stripe.com/test_default',
            enterprise: process.env.STRIPE_PAYMENT_LINK_PREMIUM || '/contact.html'
        };

        // Check if we're in production mode
        const isProduction = process.env.NODE_ENV === 'production';

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                links,
                isProduction,
                message: isProduction ? 'Production payment links' : 'Test mode payment links'
            })
        };
    } catch (error) {
        console.error('Error fetching payment links:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch payment links',
                links: {
                    launch: 'https://buy.stripe.com/test_default',
                    bundle: 'https://buy.stripe.com/test_default',
                    enterprise: '/contact.html'
                }
            })
        };
    }
};