/**
 * Send PR Notification Email
 * Sends email after PR is live
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
        const { email, prUrl, headline, company } = JSON.parse(event.body || '{}');

        if (!email || !prUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing email or PR URL' })
            };
        }

        // Send email via send-email API
        const emailData = {
            to: email,
            subject: `Your Press Release is Live - ${company || 'PressWire.ie'}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #000;">Your Press Release is Now Live! 🎉</h2>

                    <p>Great news! Your press release has been successfully published on PressWire.ie.</p>

                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">${headline || 'Your Press Release'}</h3>
                        <p>View your live press release:</p>
                        <a href="https://presswire.ie${prUrl}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                            View Press Release →
                        </a>
                    </div>

                    <h3>What Happens Next?</h3>
                    <ul>
                        <li>Your PR is now indexed and searchable</li>
                        <li>Google will crawl and index it within 24-48 hours</li>
                        <li>Journalists can discover it through our platform</li>
                        <li>Share the link on social media for maximum reach</li>
                    </ul>

                    <p style="margin-top: 30px;">
                        <strong>Share your PR:</strong><br>
                        <a href="https://twitter.com/intent/tweet?url=https://presswire.ie${prUrl}">Share on Twitter</a> |
                        <a href="https://www.linkedin.com/sharing/share-offsite/?url=https://presswire.ie${prUrl}">Share on LinkedIn</a>
                    </p>

                    <hr style="border: none; border-top: 1px solid #ccc; margin: 30px 0;">

                    <p style="color: #666; font-size: 12px;">
                        Thank you for using PressWire.ie<br>
                        Ireland's Domain-Verified Press Release Platform
                    </p>
                </div>
            `,
            text: `Your press release is now live!\n\nView it at: https://presswire.ie${prUrl}\n\nThank you for using PressWire.ie`
        };

        // Call send-email API
        const response = await fetch(`${process.env.URL || 'https://presswire.ie'}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData)
        });

        if (!response.ok) {
            throw new Error('Failed to send email');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Notification email sent'
            })
        };

    } catch (error) {
        console.error('Error sending PR notification:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to send notification',
                message: error.message
            })
        };
    }
};