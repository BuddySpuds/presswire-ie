/**
 * Complete Flow Testing & Debugging Script
 * Tests: Email Verification → Payment → PR Generation → Publication
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = 'https://presswire.ie';
const LOCAL_URL = 'http://localhost:8000'; // For local testing
const TEST_EMAIL = 'test@example.ie'; // Change to a real .ie email for production test
const USE_LOCAL = false; // Set to true for local testing

async function testCompleteFlow() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500 // Slow down for visibility
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable console logging
    page.on('console', msg => console.log('Browser:', msg.text()));
    page.on('pageerror', err => console.error('Page error:', err));

    const url = USE_LOCAL ? LOCAL_URL : BASE_URL;

    try {
        console.log('🚀 Starting Complete Flow Test\n');

        // Step 1: Navigate to generate page
        console.log('📝 Step 1: Navigate to PR generation page');
        await page.goto(`${url}/generate.html`);
        await page.waitForLoadState('networkidle');

        // Step 2: Fill in company details
        console.log('🏢 Step 2: Fill company details');
        await page.fill('input[name="companyName"]', 'Test Company Ltd');
        await page.fill('input[name="email"]', TEST_EMAIL);
        await page.fill('input[name="croNumber"]', '123456');

        // Development mode should auto-verify
        if (TEST_EMAIL.endsWith('.ie')) {
            console.log('✅ Using .ie domain - should auto-verify in development mode');
        }

        // Click continue
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(1000);

        // Step 3: Fill PR details
        console.log('📰 Step 3: Fill press release details');
        await page.fill('input[name="prTitle"]', 'Test Company Launches Revolutionary Product');
        await page.fill('textarea[name="prContent"]', `
            Test Company Ltd, a leading innovator in the technology sector, today announced
            the launch of their groundbreaking new product that will transform the industry.

            The product features cutting-edge technology that delivers unprecedented performance
            and reliability to customers worldwide.
        `);

        // Add some additional details
        await page.fill('input[name="contactName"]', 'John Smith');
        await page.fill('input[name="contactPhone"]', '+353 1 234 5678');
        await page.fill('input[name="websiteUrl"]', 'https://testcompany.ie');

        // Select categories
        await page.selectOption('select[name="industry"]', 'Technology');
        await page.selectOption('select[name="prType"]', 'Product Launch');

        // Click continue to preview
        await page.click('button:has-text("Continue to Preview")');
        await page.waitForTimeout(1000);

        // Step 4: Review and select package
        console.log('💰 Step 4: Select payment package');

        // Check localStorage for session data
        const sessionData = await page.evaluate(() => {
            const keys = Object.keys(localStorage);
            const data = {};
            keys.forEach(key => {
                if (key.startsWith('pr_') || key === 'prDraft' || key === 'currentSessionId') {
                    data[key] = localStorage.getItem(key);
                }
            });
            return data;
        });

        console.log('📦 Session data stored:', Object.keys(sessionData));

        // Select the €1 test package
        await page.click('button:has-text("€1")');

        // This should redirect to Stripe
        console.log('🔄 Waiting for Stripe redirect...');

        // Wait for either Stripe checkout or error
        try {
            await page.waitForURL(/stripe\.com|checkout\.stripe\.com/, { timeout: 10000 });
            console.log('✅ Redirected to Stripe checkout');

            // Get the Stripe session URL
            const stripeUrl = page.url();
            console.log('📍 Stripe URL:', stripeUrl);

            // Fill test card details
            console.log('💳 Filling test card details');
            await page.fill('input[placeholder*="Card number"]', '4242424242424242');
            await page.fill('input[placeholder*="MM / YY"]', '12/25');
            await page.fill('input[placeholder*="CVC"]', '123');
            await page.fill('input[placeholder*="Email"]', TEST_EMAIL);

            // Submit payment
            await page.click('button[type="submit"]');

            // Wait for success redirect
            await page.waitForURL(/success/, { timeout: 30000 });
            console.log('✅ Payment successful, redirected to success page');

        } catch (error) {
            console.error('❌ Stripe redirect failed:', error);

            // Check for errors on the page
            const errorText = await page.textContent('body');
            if (errorText.includes('error')) {
                console.log('Page error content:', errorText.substring(0, 500));
            }
        }

        // Step 5: Check success page
        console.log('🎉 Step 5: Verify success page');

        const successUrl = page.url();
        console.log('Success URL:', successUrl);

        // Wait for PR generation
        await page.waitForTimeout(5000);

        // Check if PR URL was generated
        const prLink = await page.$('a[href*="/news/"]');
        if (prLink) {
            const prUrl = await prLink.getAttribute('href');
            console.log('✅ PR URL generated:', prUrl);

            // Navigate to PR
            await page.goto(`${url}${prUrl}`);
            console.log('📄 Viewing published PR');

            // Take screenshot
            await page.screenshot({ path: 'pr-published.png' });
            console.log('📸 Screenshot saved: pr-published.png');
        } else {
            console.log('❌ No PR URL found on success page');
        }

        // Step 6: Check webhook logs
        console.log('\n🔍 Step 6: Debugging Information');

        // Get final localStorage state
        const finalData = await page.evaluate(() => {
            return {
                localStorage: Object.keys(localStorage).reduce((acc, key) => {
                    acc[key] = localStorage.getItem(key);
                    return acc;
                }, {}),
                sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
                    acc[key] = sessionStorage.getItem(key);
                    return acc;
                }, {})
            };
        });

        console.log('Final storage state:', finalData);

    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'error-screenshot.png' });
        console.log('Error screenshot saved: error-screenshot.png');
    } finally {
        await browser.close();
    }
}

// Run the test
console.log('🧪 PressWire.ie Complete Flow Test\n');
console.log('================================\n');

testCompleteFlow()
    .then(() => {
        console.log('\n✅ Test completed');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Test failed:', err);
        process.exit(1);
    });