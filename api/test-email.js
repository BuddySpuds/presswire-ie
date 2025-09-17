/**
 * Direct Email Test Endpoint
 * Tests if emails can actually be sent
 */

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const { email } = JSON.parse(event.body || '{}');

    const results = {
        email: email || 'test@example.ie',
        timestamp: new Date().toISOString(),
        environment: {
            SMTP_HOST: process.env.SMTP_HOST ? 'SET' : 'MISSING',
            SMTP_USER: process.env.SMTP_USER ? 'SET' : 'MISSING',
            SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'MISSING',
            SMTP_PORT: process.env.SMTP_PORT || '587',
            NODE_ENV: process.env.NODE_ENV || 'production'
        },
        tests: {}
    };

    // Test 1: Check if nodemailer is available
    try {
        const nodemailer = require('nodemailer');
        results.tests.nodemailer = 'Available';
    } catch (error) {
        results.tests.nodemailer = `Failed: ${error.message}`;
    }

    // Test 2: Try to create transporter
    if (process.env.SMTP_HOST && process.env.SMTP_PASS) {
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: false,
                auth: {
                    user: process.env.SMTP_USER || 'resend',
                    pass: process.env.SMTP_PASS
                },
                logger: true,
                debug: true
            });

            results.tests.transporter = 'Created';

            // Test 3: Verify connection
            try {
                await transporter.verify();
                results.tests.connection = 'Verified';
            } catch (error) {
                results.tests.connection = `Failed: ${error.message}`;
            }

            // Test 4: Send test email
            if (email && email.includes('@')) {
                try {
                    const testCode = Math.floor(100000 + Math.random() * 900000);
                    const info = await transporter.sendMail({
                        from: 'PressWire.ie <noreply@presswire.ie>',
                        to: email,
                        subject: `Test Email - Code: ${testCode}`,
                        html: `<h1>Test Email from PressWire.ie</h1>
                               <p>Your test code is: <strong>${testCode}</strong></p>
                               <p>If you received this, email is working!</p>`,
                        text: `Test email from PressWire.ie. Code: ${testCode}`
                    });

                    results.tests.emailSent = {
                        success: true,
                        messageId: info.messageId,
                        response: info.response,
                        code: testCode
                    };
                } catch (error) {
                    results.tests.emailSent = {
                        success: false,
                        error: error.message,
                        code: error.code,
                        command: error.command
                    };
                }
            } else {
                results.tests.emailSent = 'Skipped - no valid email provided';
            }
        } catch (error) {
            results.tests.transporter = `Failed: ${error.message}`;
        }
    } else {
        results.tests.smtp = 'SMTP not configured';
        results.recommendations = [
            'Add SMTP_HOST to Netlify environment variables',
            'Add SMTP_PASS to Netlify environment variables',
            'For Resend: SMTP_HOST=smtp.resend.com',
            'For Resend: SMTP_USER=resend',
            'For Resend: SMTP_PASS=your-resend-api-key'
        ];
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(results, null, 2)
    };
};