// Email Sending API
// Handles all email communications for PressWire.ie

const nodemailer = require('nodemailer');

// Email configuration based on provider
const getTransporter = () => {
    // For development/testing - log emails to console
    if (!process.env.SMTP_HOST || process.env.NODE_ENV === 'development') {
        return {
            sendMail: async (options) => {
                console.log('=== EMAIL SIMULATION ===');
                console.log('To:', options.to);
                console.log('Subject:', options.subject);
                console.log('Content:', options.html || options.text);
                console.log('========================');
                return { messageId: 'test-' + Date.now() };
            }
        };
    }

    // Production email configuration
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

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
        const { type, to, data } = JSON.parse(event.body);

        // Validate email address
        if (!to || !to.includes('@')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid email address' })
            };
        }

        const transporter = getTransporter();
        let emailOptions;

        switch (type) {
            case 'verification-code':
                emailOptions = getVerificationEmail(to, data);
                break;

            case 'management-link':
                emailOptions = getManagementLinkEmail(to, data);
                break;

            case 'contact-form':
                emailOptions = getContactFormEmail(data);
                break;

            case 'discount-code':
                emailOptions = getDiscountEmail(to, data);
                break;

            case 'pr-published':
                emailOptions = getPRPublishedEmail(to, data);
                break;

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid email type' })
                };
        }

        // Send email
        const info = await transporter.sendMail(emailOptions);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                messageId: info.messageId,
                message: 'Email sent successfully'
            })
        };

    } catch (error) {
        console.error('Email error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to send email',
                message: error.message
            })
        };
    }
};

// Email Templates

function getVerificationEmail(to, data) {
    const { code, domain } = data;

    return {
        from: '"PressWire.ie" <noreply@presswire.ie>',
        to,
        subject: 'Verify your email - PressWire.ie',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #000; color: white; padding: 20px; text-align: center; }
                    .code-box { background: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center; }
                    .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; }
                    .footer { color: #666; font-size: 12px; margin-top: 40px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>PressWire.ie</h1>
                        <p>Domain Verification</p>
                    </div>

                    <h2>Verify your email address</h2>
                    <p>You're verifying ${to} for domain ${domain}</p>

                    <div class="code-box">
                        <p>Your verification code is:</p>
                        <div class="code">${code}</div>
                    </div>

                    <p>This code expires in 10 minutes.</p>

                    <div class="footer">
                        <p>© 2025 PressWire.ie - Ireland's Domain-Verified Press Release Platform</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `Your PressWire.ie verification code is: ${code}\n\nThis code expires in 10 minutes.`
    };
}

function getManagementLinkEmail(to, data) {
    const { managementUrl, headline, company } = data;

    return {
        from: '"PressWire.ie" <noreply@presswire.ie>',
        to,
        subject: 'Your Press Release is Live - PressWire.ie',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #000; color: white; padding: 20px; text-align: center; }
                    .button { display: inline-block; padding: 12px 24px; background: #000; color: white; text-decoration: none; border-radius: 4px; }
                    .footer { color: #666; font-size: 12px; margin-top: 40px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>PressWire.ie</h1>
                        <p>Press Release Published</p>
                    </div>

                    <h2>Your press release is now live!</h2>

                    <p><strong>Headline:</strong> ${headline}</p>
                    <p><strong>Company:</strong> ${company}</p>

                    <h3>Manage Your Press Release</h3>
                    <p>Use the link below to:</p>
                    <ul>
                        <li>View real-time analytics</li>
                        <li>Edit your PR (within 24 hours)</li>
                        <li>Download as PDF</li>
                        <li>Unpublish if needed</li>
                    </ul>

                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${managementUrl}" class="button">Manage Your PR</a>
                    </p>

                    <p><strong>Important:</strong> Save this link - it's your only way to manage this press release. The link is valid for 7 days.</p>

                    <div class="footer">
                        <p>© 2025 PressWire.ie - Ireland's Domain-Verified Press Release Platform</p>
                        <p>Need help? Contact support@presswire.ie</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `Your press release "${headline}" is now live on PressWire.ie!\n\nManage your PR at: ${managementUrl}\n\nSave this link - it's valid for 7 days.`
    };
}

function getContactFormEmail(data) {
    const { name, email, company, message, subject = 'Contact Form Submission' } = data;

    return {
        from: '"PressWire.ie Contact" <contact@presswire.ie>',
        to: 'support@presswire.ie', // Your support email
        replyTo: email,
        subject: `Contact Form: ${subject}`,
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <h2>New Contact Form Submission</h2>

                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Company:</strong> ${company || 'Not provided'}</p>

                <h3>Message:</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>

                <hr>
                <p style="color: #666; font-size: 12px;">
                    Submitted via PressWire.ie contact form at ${new Date().toISOString()}
                </p>
            </body>
            </html>
        `,
        text: `New contact form submission:\n\nName: ${name}\nEmail: ${email}\nCompany: ${company || 'Not provided'}\n\nMessage:\n${message}`
    };
}

function getDiscountEmail(to, data) {
    const { code, discountPercent, expiresAt, description } = data;

    return {
        from: '"PressWire.ie" <offers@presswire.ie>',
        to,
        subject: `Your ${discountPercent}% Discount Code - PressWire.ie`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #000; color: white; padding: 20px; text-align: center; }
                    .discount-box { background: #f0f9ff; border: 2px dashed #0ea5e9; padding: 20px; margin: 20px 0; text-align: center; }
                    .code { font-size: 24px; font-weight: bold; color: #0ea5e9; }
                    .footer { color: #666; font-size: 12px; margin-top: 40px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>PressWire.ie</h1>
                        <p>Special Offer</p>
                    </div>

                    <h2>Your Exclusive ${discountPercent}% Discount!</h2>

                    ${description ? `<p>${description}</p>` : ''}

                    <div class="discount-box">
                        <p>Use this code at checkout:</p>
                        <div class="code">${code}</div>
                        <p>Save ${discountPercent}% on your press release</p>
                    </div>

                    <p><strong>Valid until:</strong> ${new Date(expiresAt).toLocaleDateString()}</p>

                    <p style="text-align: center; margin: 30px 0;">
                        <a href="https://presswire.ie/generate.html" style="display: inline-block; padding: 12px 24px; background: #000; color: white; text-decoration: none; border-radius: 4px;">
                            Submit Your PR Now
                        </a>
                    </p>

                    <div class="footer">
                        <p>© 2025 PressWire.ie - Ireland's Domain-Verified Press Release Platform</p>
                        <p>This offer is non-transferable and subject to our terms of service.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `Your ${discountPercent}% discount code for PressWire.ie: ${code}\n\nValid until: ${new Date(expiresAt).toLocaleDateString()}\n\nUse it at: https://presswire.ie/generate.html`
    };
}

function getPRPublishedEmail(to, data) {
    const { url, headline, company } = data;

    return {
        from: '"PressWire.ie" <noreply@presswire.ie>',
        to,
        subject: 'Press Release Published - PressWire.ie',
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <h2>Press Release Published Successfully</h2>

                <p>Your press release has been published on PressWire.ie:</p>

                <p><strong>Headline:</strong> ${headline}</p>
                <p><strong>Company:</strong> ${company}</p>
                <p><strong>URL:</strong> <a href="${url}">${url}</a></p>

                <p>Your press release is now indexed and available to search engines.</p>

                <hr>
                <p style="color: #666; font-size: 12px;">
                    © 2025 PressWire.ie - Ireland's Domain-Verified Press Release Platform
                </p>
            </body>
            </html>
        `,
        text: `Your press release "${headline}" has been published at: ${url}`
    };
}