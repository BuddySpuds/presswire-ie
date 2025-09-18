#!/usr/bin/env node

const { chromium } = require('playwright');

async function testEmailVerification() {
    console.log('🧪 Testing Email Verification Flow\n');
    console.log('==================================\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500,
        devtools: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Log all console messages
    page.on('console', msg => {
        console.log(`[Browser ${msg.type()}]:`, msg.text());
    });

    // Log all network requests
    page.on('request', request => {
        if (request.url().includes('/api/')) {
            console.log(`📤 API Request: ${request.method()} ${request.url()}`);
            if (request.postData()) {
                console.log('   Body:', request.postData());
            }
        }
    });

    page.on('response', response => {
        if (response.url().includes('/api/')) {
            console.log(`📥 API Response: ${response.status()} ${response.url()}`);
        }
    });

    try {
        // Navigate to the generate page
        console.log('1️⃣ Navigating to generate page...\n');
        await page.goto('https://presswire.ie/generate.html');
        await page.waitForLoadState('networkidle');

        // Check what's visible on page load
        console.log('2️⃣ Checking initial page state...\n');

        const step1Visible = await page.isVisible('#step1');
        const step2Visible = await page.isVisible('#step2');

        console.log('Step 1 visible:', step1Visible);
        console.log('Step 2 visible:', step2Visible);

        // Try to fill in email
        console.log('\n3️⃣ Filling email field...\n');

        const emailInput = await page.$('#company-email');
        if (emailInput) {
            await emailInput.fill('test@presswire.ie');
            console.log('✅ Email field filled\n');
        } else {
            console.log('❌ Email field not found!\n');
        }

        // Click the send verification button
        console.log('4️⃣ Looking for verification button...\n');

        const verifyButton = await page.$('button:has-text("Send Verification Code")');
        if (verifyButton) {
            console.log('Found button, clicking...\n');

            // Set up response listener before clicking
            const responsePromise = page.waitForResponse(
                response => response.url().includes('/api/verify-domain'),
                { timeout: 10000 }
            ).catch(err => {
                console.log('No API call detected');
                return null;
            });

            await verifyButton.click();

            const response = await responsePromise;
            if (response) {
                const responseBody = await response.json().catch(() => null);
                console.log('API Response:', responseBody);
            }
        } else {
            console.log('❌ Verification button not found!\n');
        }

        // Wait a moment
        await page.waitForTimeout(3000);

        // Check what step we're on now
        console.log('\n5️⃣ Checking current state after button click...\n');

        const step1StillVisible = await page.isVisible('#step1');
        const step2NowVisible = await page.isVisible('#step2');
        const verificationCodeVisible = await page.isVisible('#verification-code-section');

        console.log('Step 1 still visible:', step1StillVisible);
        console.log('Step 2 now visible:', step2NowVisible);
        console.log('Verification code section visible:', verificationCodeVisible);

        // Check for any JavaScript errors
        console.log('\n6️⃣ Checking for JavaScript errors...\n');

        const errors = await page.evaluate(() => {
            return window.consoleErrors || [];
        });

        if (errors.length > 0) {
            console.log('JavaScript errors found:', errors);
        }

        // Get the current URL to see if we've navigated
        const currentUrl = page.url();
        console.log('\nCurrent URL:', currentUrl);

        // Take a screenshot
        await page.screenshot({ path: 'email-verification-state.png', fullPage: true });
        console.log('\n📸 Screenshot saved: email-verification-state.png');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        await page.screenshot({ path: 'error-state.png', fullPage: true });
    } finally {
        console.log('\n🏁 Test complete. Press Ctrl+C to exit.');
        // Keep browser open for inspection
        await new Promise(() => {}); // Wait indefinitely
    }
}

testEmailVerification().catch(console.error);