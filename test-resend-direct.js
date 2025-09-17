#!/usr/bin/env node

/**
 * Direct test of Resend email sending
 * Tests if the email service is properly configured
 */

const fetch = require('node-fetch');

async function testResendDirectly() {
    console.log('🔧 Testing Resend Configuration Directly\n');
    console.log('======================================\n');

    const testEmail = process.argv[2] || 'test@presswire.ie';

    console.log('Testing with email:', testEmail);
    console.log('\n1️⃣ Testing verify-domain endpoint...\n');

    try {
        // Test the verify-domain endpoint
        const response = await fetch('https://presswire.ie/api/verify-domain', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'send-code',
                email: testEmail
            })
        });

        const data = await response.json();

        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ API call successful!');

            if (data.code) {
                console.log('📝 Development mode - Verification code:', data.code);
                console.log('   (In production, this would be sent via email)');
            } else {
                console.log('📧 Check your email for the verification code');
            }

            // If we got a code, test verification
            if (data.code) {
                console.log('\n2️⃣ Testing code verification...\n');

                const verifyResponse = await fetch('https://presswire.ie/api/verify-domain', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'verify-code',
                        email: testEmail,
                        code: data.code
                    })
                });

                const verifyData = await verifyResponse.json();

                console.log('Verification response:', response.status);
                console.log('Verification data:', JSON.stringify(verifyData, null, 2));

                if (verifyResponse.ok && verifyData.token) {
                    console.log('\n✅ Verification successful!');
                    console.log('🔑 Token received:', verifyData.token);
                } else {
                    console.log('\n❌ Verification failed:', verifyData.error || 'Unknown error');
                }
            }
        } else {
            console.log('\n❌ API call failed!');
            console.log('Error:', data.error || 'Unknown error');
            console.log('\nPossible issues:');
            console.log('- Email not in .ie domain');
            console.log('- Resend not configured properly');
            console.log('- API endpoint not deployed');
        }

        // Test if the new endpoints exist
        console.log('\n3️⃣ Checking if new endpoints are deployed...\n');

        const endpoints = [
            '/api/save-pr-no-build',
            '/api/stripe-webhook',
            '/api/verify-domain'
        ];

        for (const endpoint of endpoints) {
            try {
                const checkResponse = await fetch(`https://presswire.ie${endpoint}`, {
                    method: 'GET'
                });
                console.log(`${endpoint}: ${checkResponse.status === 405 ? '✅ Exists' : `❌ Status ${checkResponse.status}`}`);
            } catch (error) {
                console.log(`${endpoint}: ❌ Error`);
            }
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\nThis usually means:');
        console.log('- The API endpoint is not responding');
        console.log('- Network connection issue');
        console.log('- Deployment not complete');
    }

    console.log('\n======================================');
    console.log('Test complete\n');
    console.log('Next steps:');
    console.log('1. Wait 2-3 minutes for deployment to complete');
    console.log('2. Check Netlify dashboard for build status');
    console.log('3. Test again with a real .ie email address');
}

// Run the test
if (require.main === module) {
    testResendDirectly();
}