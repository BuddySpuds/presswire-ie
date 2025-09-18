#!/usr/bin/env node

/**
 * Email Verification Test Script
 * Tests the Resend email integration
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = 'https://presswire.ie/api/send-email';
const TEST_EMAIL = process.argv[2] || 'test@example.ie';

async function testEmailVerification() {
    console.log('📧 Testing Email Verification System\n');
    console.log('=====================================\n');

    // Step 1: Send verification code
    console.log('1️⃣ Sending verification code to:', TEST_EMAIL);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'send-code',
                email: TEST_EMAIL
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Success:', data.message || 'Verification code sent');

            if (data.code) {
                console.log('📝 Development mode - Code:', data.code);
            } else {
                console.log('📬 Check your email for the verification code');
            }

            // In development, we can test verification immediately
            if (data.code) {
                console.log('\n2️⃣ Testing code verification...');

                const verifyResponse = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'verify-code',
                        email: TEST_EMAIL,
                        code: data.code
                    })
                });

                const verifyData = await verifyResponse.json();

                if (verifyResponse.ok) {
                    console.log('✅ Verification successful!');
                    console.log('🔑 Token:', verifyData.token);
                } else {
                    console.log('❌ Verification failed:', verifyData.error);
                }
            }
        } else {
            console.log('❌ Error:', data.error || 'Failed to send verification code');
            console.log('Response status:', response.status);
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }

    // Step 2: Test other email types
    console.log('\n3️⃣ Testing other email templates...\n');

    const emailTests = [
        {
            action: 'send-discount',
            email: TEST_EMAIL,
            code: 'TEST20',
            discount: 20,
            description: 'Testing discount code email'
        },
        {
            action: 'send-contact',
            email: 'support@presswire.ie',
            name: 'Test User',
            message: 'This is a test contact form submission',
            userEmail: TEST_EMAIL,
            description: 'Testing contact form email'
        }
    ];

    for (const test of emailTests) {
        console.log(`📮 ${test.description}`);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(test)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`✅ Success: ${data.message || 'Email sent'}`);
            } else {
                console.log(`❌ Failed: ${data.error}`);
            }
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
        }

        console.log('');
    }

    console.log('📊 Test Summary\n');
    console.log('=====================================\n');
    console.log('Email system test completed.');
    console.log('\nNext steps:');
    console.log('1. Check if emails were received');
    console.log('2. Verify email formatting is correct');
    console.log('3. Test with a real .ie domain email');
    console.log('4. Monitor Resend dashboard for delivery status');
}

// Run the test
testEmailVerification().catch(console.error);