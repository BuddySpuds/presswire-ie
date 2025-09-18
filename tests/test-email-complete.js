#!/usr/bin/env node

/**
 * Complete Email System Test with Playwright
 * Tests DNS, API endpoints, and actual email sending
 */

const { chromium } = require('playwright');
const dns = require('dns').promises;

async function checkDNS() {
    console.log('🔍 Checking DNS Configuration...\n');

    const checks = {
        'send.presswire.ie': {
            MX: false,
            TXT: false
        },
        'presswire.ie': {
            MX: false,
            TXT: false
        }
    };

    // Check MX records
    try {
        const mx = await dns.resolveMx('send.presswire.ie');
        if (mx.length > 0) {
            console.log('✅ MX record found for send.presswire.ie:', mx[0].exchange);
            checks['send.presswire.ie'].MX = true;
        }
    } catch (e) {
        console.log('❌ No MX record for send.presswire.ie (REQUIRED FOR RESEND)');
    }

    try {
        const mx = await dns.resolveMx('presswire.ie');
        if (mx.length > 0) {
            console.log('✅ MX record found for presswire.ie:', mx[0].exchange);
            checks['presswire.ie'].MX = true;
        }
    } catch (e) {
        console.log('❌ No MX record for presswire.ie');
    }

    // Check TXT/SPF records
    try {
        const txt = await dns.resolveTxt('send.presswire.ie');
        const spf = txt.find(t => t[0].includes('spf1'));
        if (spf) {
            console.log('✅ SPF record found for send.presswire.ie:', spf[0]);
            checks['send.presswire.ie'].TXT = true;
        }
    } catch (e) {
        console.log('❌ No SPF record for send.presswire.ie (REQUIRED FOR RESEND)');
    }

    try {
        const txt = await dns.resolveTxt('presswire.ie');
        const spf = txt.find(t => t[0].includes('spf1'));
        if (spf) {
            console.log('✅ SPF record found for presswire.ie:', spf[0]);
            checks['presswire.ie'].TXT = true;
        }
    } catch (e) {
        console.log('❌ No SPF record for presswire.ie');
    }

    // Check DKIM
    try {
        const dkim = await dns.resolveTxt('resend._domainkey.presswire.ie');
        if (dkim.length > 0) {
            console.log('✅ DKIM record found (verified)');
        }
    } catch (e) {
        console.log('❌ No DKIM record found');
    }

    return checks;
}

async function testEmailWithPlaywright() {
    console.log('\n📧 Testing Email System with Playwright...\n');

    const browser = await chromium.launch({
        headless: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Navigate to generate page
        console.log('1️⃣ Navigating to generate page...');
        await page.goto('https://presswire.ie/generate.html');

        // Fill email field
        const testEmail = 'test@presswire.ie';
        console.log(`2️⃣ Testing with email: ${testEmail}`);

        await page.fill('#company-email', testEmail);

        // Set up request interception
        let apiCalled = false;
        let apiResponse = null;

        page.on('response', async (response) => {
            if (response.url().includes('/api/verify-domain')) {
                apiCalled = true;
                apiResponse = await response.json().catch(() => null);
            }
        });

        // Click send verification
        console.log('3️⃣ Clicking Send Verification Code...');
        await page.click('button:has-text("Send Verification Code")');

        // Wait for API call
        await page.waitForTimeout(3000);

        if (apiCalled) {
            console.log('✅ API was called');
            if (apiResponse) {
                console.log('API Response:', JSON.stringify(apiResponse, null, 2));

                if (apiResponse.success) {
                    console.log('✅ Verification initiated successfully');
                    if (apiResponse.demoCode) {
                        console.log(`📝 Demo code returned: ${apiResponse.demoCode}`);
                        console.log('⚠️  This means email is NOT actually being sent');
                    } else {
                        console.log('✅ Email should have been sent (no demo code)');
                    }
                } else {
                    console.log('❌ Verification failed:', apiResponse.error);
                }
            }
        } else {
            console.log('❌ API was not called - check JavaScript errors');
        }

        // Test the diagnostic endpoint
        console.log('\n4️⃣ Testing diagnostic endpoint...');
        const diagResponse = await page.evaluate(async () => {
            const response = await fetch('/api/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'test@presswire.ie' })
            });
            return response.json();
        });

        console.log('\nDiagnostic Results:');
        console.log('Environment:', diagResponse.environment);
        console.log('Tests:', diagResponse.tests);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

async function testDirectAPI() {
    console.log('\n🔬 Direct API Test...\n');

    const fetch = require('node-fetch');

    try {
        const response = await fetch('https://presswire.ie/api/verify-domain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send-code',
                email: 'test@presswire.ie'
            })
        });

        const data = await response.json();
        console.log('Direct API Response:', JSON.stringify(data, null, 2));

        if (data.demoCode) {
            console.log('\n⚠️  ISSUE: Demo code is being returned');
            console.log('This means either:');
            console.log('1. SMTP_HOST is not configured in Netlify');
            console.log('2. Nodemailer is failing to load');
            console.log('3. Email sending is failing silently');
        }

    } catch (error) {
        console.error('API test failed:', error);
    }
}

async function runCompleteTest() {
    console.log('🚀 PressWire.ie Email System Complete Test\n');
    console.log('==========================================\n');

    // Check DNS
    const dnsResults = await checkDNS();

    // Test with Playwright
    await testEmailWithPlaywright();

    // Direct API test
    await testDirectAPI();

    // Summary
    console.log('\n📊 SUMMARY\n');
    console.log('==========\n');

    if (!dnsResults['send.presswire.ie'].MX || !dnsResults['send.presswire.ie'].TXT) {
        console.log('❌ CRITICAL: DNS not configured for send.presswire.ie');
        console.log('\n📋 TO FIX:');
        console.log('1. Add MX record: send → feedback-smtp.eu-west-1.amazonses.com');
        console.log('2. Add TXT record: send → v=spf1 include:amazonses.com ~all');
        console.log('\nOR change Resend to use root domain instead of subdomain');
    } else {
        console.log('✅ DNS properly configured');
        console.log('\nIf emails still not sending, check:');
        console.log('1. SMTP_HOST, SMTP_USER, SMTP_PASS in Netlify env vars');
        console.log('2. Resend API key is correct');
        console.log('3. From address matches verified domain');
    }
}

// Run the test
runCompleteTest().catch(console.error);