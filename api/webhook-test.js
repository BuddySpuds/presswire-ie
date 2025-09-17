/**
 * Webhook Test Endpoint
 * Tests what environment variables are available and webhook processing
 */

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Log all environment variables (safely)
    const envCheck = {
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
        STRIPE_WEBHOOK_SECRET_TEST: !!process.env.STRIPE_WEBHOOK_SECRET_TEST,
        GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
        GITHUB_OWNER: process.env.GITHUB_OWNER || 'NOT_SET',
        GITHUB_REPO: process.env.GITHUB_REPO || 'NOT_SET'
    };

    // Test if Stripe can be loaded
    let stripeStatus = 'NOT_TESTED';
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
        stripeStatus = 'LOADED';

        // Test if webhook secret works
        if (event.body && event.headers && event.headers['stripe-signature']) {
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET;

            try {
                const stripeEvent = stripe.webhooks.constructEvent(
                    event.body,
                    event.headers['stripe-signature'],
                    webhookSecret
                );

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Webhook signature verified!',
                        eventType: stripeEvent.type,
                        eventId: stripeEvent.id,
                        environment: envCheck
                    })
                };
            } catch (err) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: err.message,
                        environment: envCheck,
                        webhookSecret: webhookSecret ? webhookSecret.substring(0, 10) + '...' : 'NOT_SET'
                    })
                };
            }
        }
    } catch (error) {
        stripeStatus = `ERROR: ${error.message}`;
    }

    // Return environment status
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'Webhook test endpoint',
            environment: envCheck,
            stripeStatus: stripeStatus,
            method: event.httpMethod,
            hasBody: !!event.body,
            hasSignature: !!(event.headers && event.headers['stripe-signature']),
            headers: event.headers ? Object.keys(event.headers) : [],
            hint: 'Send a Stripe webhook event to test signature verification'
        }, null, 2)
    };
};