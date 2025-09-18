/**
 * Rate Limiting Middleware for Netlify Functions
 * Protects against DDoS and abuse
 */

// In-memory store (resets on cold start)
// For production, use Redis or Upstash
const requestCounts = new Map();
const blockedIPs = new Set();

// Configuration
const RATE_LIMITS = {
    'verify-domain': { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 mins
    'generate-pr': { requests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
    'send-email': { requests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
    'admin': { requests: 10, windowMs: 5 * 60 * 1000 }, // 10 per 5 mins
    'default': { requests: 30, windowMs: 60 * 1000 } // 30 per minute
};

// Permanent block list for known bad actors
const BLOCKED_IPS_PERMANENT = [
    // Add malicious IPs here
];

function getRateLimitKey(ip, endpoint) {
    return `${ip}:${endpoint}`;
}

function cleanupOldEntries() {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
        if (now - data.resetTime > 60 * 60 * 1000) { // Clean entries older than 1 hour
            requestCounts.delete(key);
        }
    }
}

exports.checkRateLimit = (event, functionName) => {
    // Extract IP address
    const ip = event.headers['x-forwarded-for'] ||
               event.headers['client-ip'] ||
               event.headers['x-real-ip'] ||
               'unknown';

    // Check permanent block list
    if (BLOCKED_IPS_PERMANENT.includes(ip)) {
        return {
            allowed: false,
            statusCode: 403,
            error: 'Your IP has been permanently blocked'
        };
    }

    // Check temporary blocks
    if (blockedIPs.has(ip)) {
        return {
            allowed: false,
            statusCode: 429,
            error: 'Too many requests. IP temporarily blocked.'
        };
    }

    // Get rate limit config for this endpoint
    const config = RATE_LIMITS[functionName] || RATE_LIMITS.default;
    const key = getRateLimitKey(ip, functionName);
    const now = Date.now();

    // Get or create request tracking
    let requestData = requestCounts.get(key);

    if (!requestData || now - requestData.resetTime > config.windowMs) {
        requestData = {
            count: 0,
            resetTime: now,
            firstRequest: now
        };
        requestCounts.set(key, requestData);
    }

    // Increment request count
    requestData.count++;

    // Check if limit exceeded
    if (requestData.count > config.requests) {
        // Block IP temporarily if repeatedly hitting limits
        if (requestData.count > config.requests * 3) {
            blockedIPs.add(ip);
            setTimeout(() => blockedIPs.delete(ip), 60 * 60 * 1000); // 1 hour block
        }

        const retryAfter = Math.ceil((requestData.resetTime + config.windowMs - now) / 1000);

        return {
            allowed: false,
            statusCode: 429,
            error: 'Rate limit exceeded',
            retryAfter,
            headers: {
                'X-RateLimit-Limit': config.requests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(requestData.resetTime + config.windowMs).toISOString(),
                'Retry-After': retryAfter.toString()
            }
        };
    }

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to cleanup
        cleanupOldEntries();
    }

    // Request allowed
    return {
        allowed: true,
        headers: {
            'X-RateLimit-Limit': config.requests.toString(),
            'X-RateLimit-Remaining': (config.requests - requestData.count).toString(),
            'X-RateLimit-Reset': new Date(requestData.resetTime + config.windowMs).toISOString()
        }
    };
};

// Helper to create rate-limited response
exports.rateLimitResponse = (checkResult) => {
    return {
        statusCode: checkResult.statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            ...checkResult.headers
        },
        body: JSON.stringify({
            error: checkResult.error,
            retryAfter: checkResult.retryAfter
        })
    };
};