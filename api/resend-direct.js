/**
 * Direct Resend API Test
 * Bypasses nodemailer and uses Resend API directly
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

    if (!email) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Email required' })
        };
    }

    const code = Math.floor(100000 + Math.random() * 900000);

    // Use Resend API directly
    if (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith('re_')) {
        try {
            const fetch = require('node-fetch');

            const resendResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.SMTP_PASS}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'PressWire.ie <onboarding@resend.dev>',  // Use Resend's test domain first
                    to: email,
                    subject: `Your Verification Code: ${code}`,
                    html: `
                        <h1>Your PressWire.ie Verification Code</h1>
                        <p style="font-size: 32px; font-weight: bold;">${code}</p>
                        <p>This code expires in 10 minutes.</p>
                    `,
                    text: `Your verification code is: ${code}`
                })
            });

            const result = await resendResponse.json();

            if (resendResponse.ok) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Email sent via Resend API',
                        code: code,  // Include for testing
                        resendId: result.id
                    })
                };
            } else {
                // Try with presswire.ie domain
                const resendResponse2 = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.SMTP_PASS}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'noreply@presswire.ie',
                        to: email,
                        subject: `Your Verification Code: ${code}`,
                        html: `<h1>Code: ${code}</h1>`
                    })
                });

                const result2 = await resendResponse2.json();

                return {
                    statusCode: resendResponse2.ok ? 200 : 400,
                    headers,
                    body: JSON.stringify({
                        success: resendResponse2.ok,
                        message: resendResponse2.ok ? 'Email sent' : 'Failed',
                        code: code,
                        firstError: result,
                        secondAttempt: result2
                    })
                };
            }
        } catch (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: error.message,
                    code: code  // Still return code so user can proceed
                })
            };
        }
    } else {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Resend API key not found or invalid',
                code: code,
                hint: 'Check SMTP_PASS starts with re_'
            })
        };
    }
};