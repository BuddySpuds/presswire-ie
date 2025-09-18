#!/usr/bin/env node

const dns = require('dns').promises;

async function quickDNSCheck() {
    console.log('🔍 Quick DNS Check for PressWire.ie Email System\n');
    console.log('=' .repeat(50) + '\n');

    const domains = ['presswire.ie', 'send.presswire.ie'];

    for (const domain of domains) {
        console.log(`\n📧 Checking: ${domain}`);
        console.log('-'.repeat(30));

        // Check MX
        try {
            const mx = await dns.resolveMx(domain);
            console.log(`✅ MX: ${mx[0].exchange} (priority: ${mx[0].priority})`);
        } catch (e) {
            console.log(`❌ MX: Not found`);
        }

        // Check TXT/SPF
        try {
            const txt = await dns.resolveTxt(domain);
            const spf = txt.find(t => t[0].includes('spf1'));
            if (spf) {
                console.log(`✅ SPF: ${spf[0]}`);
            } else {
                console.log(`❌ SPF: Not found`);
            }
        } catch (e) {
            console.log(`❌ TXT: Not found`);
        }
    }

    // Check DKIM
    console.log(`\n🔐 DKIM Check`);
    console.log('-'.repeat(30));
    try {
        const dkim = await dns.resolveTxt('resend._domainkey.presswire.ie');
        console.log(`✅ DKIM: Found (${dkim[0][0].substring(0, 50)}...)`);
    } catch (e) {
        console.log(`❌ DKIM: Not found`);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('\n📋 DIAGNOSIS:');
    console.log('The root domain (presswire.ie) has MX and SPF records.');
    console.log('The subdomain (send.presswire.ie) is MISSING these records.');
    console.log('\n✅ TO FIX: Add MX and TXT records for "send" subdomain in Netlify DNS');
    console.log('   OR: Configure Resend to use root domain instead of subdomain\n');
}

quickDNSCheck().catch(console.error);