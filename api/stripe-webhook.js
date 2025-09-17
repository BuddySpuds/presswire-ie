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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

    // Retrieve the full session with line items
    const fullSession = await stripe.checkout.sessions.retrieve(
        session.id,
        { expand: ['line_items', 'customer'] }
    );

    // Extract metadata
    const metadata = fullSession.metadata || {};
    const customerEmail = fullSession.customer_details?.email;
    const packageType = metadata.package_type;

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

    // If there's draft data in metadata, trigger PR generation
    if (metadata.pr_draft) {
        try {
            const prDraft = JSON.parse(metadata.pr_draft);
            await triggerPRGeneration(prDraft, customerEmail, session.id);
        } catch (error) {
            console.error('Error processing PR draft:', error);
        }
    }

    // Send confirmation email
    await sendConfirmationEmail(customerEmail, packageType, credits);
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
    // This would call the generate-pr API with the draft data
    console.log('Triggering PR generation for:', email);

    // In production, this would make an internal API call or queue a job
    // For now, we'll just log it
    console.log('PR Draft:', prDraft);
    console.log('Session ID:', sessionId);
}

async function sendConfirmationEmail(email, packageType, credits) {
    // Integration with email service
    console.log(`Sending confirmation email to ${email}`);
    console.log(`Package: ${packageType}, Credits: ${credits}`);

    // This would integrate with your email service (Resend, SendGrid, etc.)
    // For MVP, we can skip actual email sending
}

async function sendPaymentFailedEmail(email) {
    console.log(`Sending payment failed notification to ${email}`);
    // Email implementation here
}