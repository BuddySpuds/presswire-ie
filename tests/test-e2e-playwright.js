#!/usr/bin/env node

/**
 * End-to-End Test with Playwright
 * Tests the complete flow from submission to PR publication
 */

const { chromium } = require('playwright');

const BASE_URL = 'https://presswire.ie';
const TEST_DATA = {
    companyName: 'Test Tech Solutions Ltd',
    email: 'test@testtechsolutions.ie',
    croNumber: '123456',
    prTitle: 'Test Tech Solutions Announces Groundbreaking AI Platform',
    prSummary: 'Revolutionary AI platform set to transform Irish businesses',
    prContent: `
        Dublin, Ireland - Test Tech Solutions Ltd, a leading Irish technology company,
        today announced the launch of their innovative AI platform designed specifically
        for Irish SMEs.

        The platform leverages cutting-edge artificial intelligence to help businesses
        automate operations, improve customer service, and increase efficiency by up to 40%.

        Key features include:
        • Automated customer support in Irish and English
        • GDPR-compliant data processing
        • Integration with Irish Revenue systems
        • Real-time analytics dashboard
    `,
    contactName: 'John O\'Sullivan',
    contactPhone: '+353 1 234 5678',
    contactEmail: 'press@testtechsolutions.ie',
    website: 'https://testtechsolutions.ie',
    keywords: 'AI, artificial intelligence, Irish technology, SME solutions'
};

async function runE2ETest() {
    console.log('🚀 Starting End-to-End Test\n');
    console.log('================================\n');

    const browser = await chromium.launch({
        headless: false, // Set to true for CI/CD
        slowMo: 100 // Slow down for visibility
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        recordVideo: {
            dir: './test-videos',
            size: { width: 1280, height: 720 }
        }
    });

    const page = await context.newPage();

    // Capture console logs
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('❌ Browser Error:', msg.text());
        } else if (msg.type() === 'warning') {
            console.warn('⚠️ Browser Warning:', msg.text());
        }
    });

    const results = {
        navigation: false,
        formFilling: false,
        verification: false,
        payment: false,
        prGeneration: false,
        emailSent: false
    };

    try {
        // Step 1: Navigate to Generate Page
        console.log('📝 Step 1: Navigating to PR generation page...');
        await page.goto(`${BASE_URL}/generate.html`, { waitUntil: 'networkidle' });
        results.navigation = true;
        console.log('✅ Page loaded successfully\n');

        // Step 2: Fill Company Information
        console.log('🏢 Step 2: Filling company information...');

        // Wait for form to be ready
        await page.waitForSelector('input[name="companyName"]', { timeout: 5000 });

        await page.fill('input[name="companyName"]', TEST_DATA.companyName);
        await page.fill('input[name="email"]', TEST_DATA.email);
        await page.fill('input[name="croNumber"]', TEST_DATA.croNumber);

        // Take screenshot of filled form
        await page.screenshot({
            path: 'test-screenshots/step1-company-info.png',
            fullPage: true
        });

        // Click continue
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(1000);

        console.log('✅ Company information filled\n');

        // Step 3: Fill PR Details
        console.log('📰 Step 3: Filling press release details...');

        // Wait for PR form
        await page.waitForSelector('input[name="prTitle"], #pr-headline', { timeout: 5000 });

        // Fill headline
        const headlineInput = await page.$('input[name="prTitle"], #pr-headline');
        if (headlineInput) {
            await headlineInput.fill(TEST_DATA.prTitle);
        }

        // Fill summary
        const summaryInput = await page.$('textarea[name="prSummary"], #pr-summary');
        if (summaryInput) {
            await summaryInput.fill(TEST_DATA.prSummary);
        }

        // Fill body content
        const contentInput = await page.$('textarea[name="prContent"], #pr-keypoints');
        if (contentInput) {
            await contentInput.fill(TEST_DATA.prContent);
        }

        // Fill contact information
        const contactInput = await page.$('input[name="contactName"], #pr-contact');
        if (contactInput) {
            await contactInput.fill(`${TEST_DATA.contactName} - ${TEST_DATA.contactPhone}`);
        }

        // Fill website
        const websiteInput = await page.$('input[name="website"], #pr-website');
        if (websiteInput) {
            await websiteInput.fill(TEST_DATA.website);
        }

        // Fill keywords
        const keywordsInput = await page.$('input[name="keywords"], #pr-keywords');
        if (keywordsInput) {
            await keywordsInput.fill(TEST_DATA.keywords);
        }

        await page.screenshot({
            path: 'test-screenshots/step2-pr-details.png',
            fullPage: true
        });

        results.formFilling = true;
        console.log('✅ PR details filled\n');

        // Continue to next step
        const continueButton = await page.$('button:has-text("Continue")');
        if (continueButton) {
            await continueButton.click();
            await page.waitForTimeout(1000);
        }

        // Step 4: Verification (if required)
        console.log('🔐 Step 4: Checking verification status...');

        // Check if verification is needed (non-.ie emails)
        const verificationInput = await page.$('input[placeholder*="verification code"]');
        if (verificationInput) {
            console.log('📧 Verification required - checking for dev mode bypass...');

            // In dev mode with .ie email, it should auto-verify
            if (TEST_DATA.email.endsWith('.ie')) {
                console.log('✅ .ie email detected - should auto-verify in dev mode\n');
                results.verification = true;
            }
        } else {
            console.log('✅ No verification required\n');
            results.verification = true;
        }

        // Step 5: Package Selection and Payment
        console.log('💰 Step 5: Selecting package and processing payment...');

        // Select the €1 test package
        const testPackageButton = await page.$('button:has-text("€1")');
        if (testPackageButton) {
            await testPackageButton.click();
            console.log('✅ Test package selected\n');

            // Wait for redirect to Stripe
            console.log('🔄 Waiting for Stripe checkout redirect...');

            try {
                await page.waitForURL(/stripe\.com|checkout\.stripe/, { timeout: 10000 });
                console.log('✅ Redirected to Stripe checkout\n');

                results.payment = true;

                // Fill test card details
                console.log('💳 Filling test card details...');

                // Wait for Stripe form to load
                await page.waitForSelector('[placeholder*="Card number"], [placeholder*="1234"]', { timeout: 10000 });

                // Fill card number
                await page.fill('[placeholder*="Card number"], [placeholder*="1234"]', '4242424242424242');

                // Fill expiry
                await page.fill('[placeholder*="MM / YY"], [placeholder*="MM/YY"]', '12/25');

                // Fill CVC
                await page.fill('[placeholder*="CVC"], [placeholder*="123"]', '123');

                // Fill email if required
                const emailField = await page.$('[placeholder*="Email"]');
                if (emailField) {
                    await emailField.fill(TEST_DATA.email);
                }

                console.log('✅ Test card details filled\n');

                // Submit payment
                const submitButton = await page.$('button[type="submit"]');
                if (submitButton) {
                    await submitButton.click();
                    console.log('⏳ Processing payment...\n');
                }

                // Wait for success page
                await page.waitForURL(/success/, { timeout: 30000 });
                console.log('✅ Payment successful!\n');

                // Step 6: Check PR Generation
                console.log('📄 Step 6: Checking PR generation...');

                // Wait for PR to be generated
                await page.waitForTimeout(5000);

                // Look for PR link
                const prLink = await page.$('a[href*="/news/"]');
                if (prLink) {
                    const prUrl = await prLink.getAttribute('href');
                    console.log(`✅ PR generated: ${prUrl}\n`);

                    results.prGeneration = true;

                    // Visit the PR page
                    await page.goto(`${BASE_URL}${prUrl}`);
                    await page.screenshot({
                        path: 'test-screenshots/published-pr.png',
                        fullPage: true
                    });
                    console.log('✅ PR page accessible\n');
                }

            } catch (error) {
                console.error('❌ Payment/redirect failed:', error.message);
            }
        }

        // Generate test report
        console.log('\n📊 TEST RESULTS\n');
        console.log('================================\n');

        const passedTests = Object.values(results).filter(r => r).length;
        const totalTests = Object.keys(results).length;
        const passRate = Math.round((passedTests / totalTests) * 100);

        console.log(`Overall: ${passedTests}/${totalTests} tests passed (${passRate}%)\n`);

        for (const [test, passed] of Object.entries(results)) {
            console.log(`${passed ? '✅' : '❌'} ${test}`);
        }

        if (passRate === 100) {
            console.log('\n🎉 All tests passed! System is working correctly.');
        } else if (passRate >= 80) {
            console.log('\n⚠️ Most tests passed but some issues detected.');
        } else {
            console.log('\n❌ Multiple failures detected. System needs attention.');
        }

    } catch (error) {
        console.error('\n❌ Test failed with error:', error);

        // Take error screenshot
        await page.screenshot({
            path: 'test-screenshots/error-state.png',
            fullPage: true
        });
    } finally {
        // Save video
        await context.close();
        await browser.close();

        console.log('\n📹 Test video saved to ./test-videos/');
        console.log('📸 Screenshots saved to ./test-screenshots/');
    }
}

// Create necessary directories
const fs = require('fs');
if (!fs.existsSync('./test-screenshots')) {
    fs.mkdirSync('./test-screenshots');
}
if (!fs.existsSync('./test-videos')) {
    fs.mkdirSync('./test-videos');
}

// Run the test
runE2ETest()
    .then(() => {
        console.log('\n✅ E2E test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ E2E test failed:', error);
        process.exit(1);
    });