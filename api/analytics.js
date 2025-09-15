// Analytics API
// Lightweight, GDPR-compliant analytics tracking

const crypto = require('crypto');

// In-memory analytics storage (will be persisted to GitHub)
const analyticsStore = new Map();
const sessionStore = new Map();

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { action, slug, sessionId, referrer } = JSON.parse(event.body || '{}');

        switch (action) {
            case 'track-view':
                return handleTrackView(slug, sessionId, referrer, headers);

            case 'get-analytics':
                return handleGetAnalytics(slug, headers);

            case 'get-summary':
                return handleGetSummary(headers);

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }

    } catch (error) {
        console.error('Analytics error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error'
            })
        };
    }
};

function handleTrackView(slug, sessionId, referrer, headers) {
    if (!slug) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Slug required' })
        };
    }

    // Get or create analytics for this PR
    let analytics = analyticsStore.get(slug);
    if (!analytics) {
        analytics = {
            slug,
            views: 0,
            uniqueSessions: new Set(),
            referrers: {},
            dailyViews: {},
            hourlyViews: {},
            countries: {},
            firstView: new Date().toISOString(),
            lastView: null
        };
        analyticsStore.set(slug, analytics);
    }

    // Generate session ID if not provided (anonymous tracking)
    const session = sessionId || generateSessionId();

    // Track view
    analytics.views++;
    analytics.lastView = new Date().toISOString();

    // Track unique sessions
    const isNewSession = !analytics.uniqueSessions.has(session);
    if (isNewSession) {
        analytics.uniqueSessions.add(session);
    }

    // Track referrer
    if (referrer && referrer !== 'direct') {
        const referrerDomain = extractDomain(referrer);
        analytics.referrers[referrerDomain] = (analytics.referrers[referrerDomain] || 0) + 1;
    }

    // Track daily views
    const today = new Date().toISOString().split('T')[0];
    analytics.dailyViews[today] = (analytics.dailyViews[today] || 0) + 1;

    // Track hourly pattern
    const hour = new Date().getHours();
    analytics.hourlyViews[hour] = (analytics.hourlyViews[hour] || 0) + 1;

    // Store session info (for return visitor tracking)
    sessionStore.set(session, {
        lastSeen: new Date().toISOString(),
        viewCount: (sessionStore.get(session)?.viewCount || 0) + 1,
        slug
    });

    // Clean up old sessions (older than 30 days)
    cleanupOldSessions();

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            tracked: true,
            sessionId: session,
            isNewVisitor: isNewSession
        })
    };
}

function handleGetAnalytics(slug, headers) {
    if (!slug) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Slug required' })
        };
    }

    const analytics = analyticsStore.get(slug);
    if (!analytics) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'No analytics found for this PR' })
        };
    }

    // Prepare response data
    const responseData = {
        slug: analytics.slug,
        totalViews: analytics.views,
        uniqueVisitors: analytics.uniqueSessions.size,
        topReferrers: getTopItems(analytics.referrers, 10),
        viewsByDay: getLast30Days(analytics.dailyViews),
        viewsByHour: analytics.hourlyViews,
        peakHour: getPeakHour(analytics.hourlyViews),
        averageDailyViews: calculateAverageDailyViews(analytics.dailyViews),
        trend: calculateTrend(analytics.dailyViews),
        firstView: analytics.firstView,
        lastView: analytics.lastView
    };

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            analytics: responseData
        })
    };
}

function handleGetSummary(headers) {
    // Get summary analytics for all PRs (admin use)
    const summary = {
        totalPRs: analyticsStore.size,
        totalViews: 0,
        totalUniqueVisitors: 0,
        topPRs: [],
        recentViews: []
    };

    // Calculate totals and find top PRs
    const prStats = [];
    for (const [slug, analytics] of analyticsStore.entries()) {
        summary.totalViews += analytics.views;
        summary.totalUniqueVisitors += analytics.uniqueSessions.size;

        prStats.push({
            slug,
            views: analytics.views,
            uniqueVisitors: analytics.uniqueSessions.size,
            lastView: analytics.lastView
        });
    }

    // Sort and get top 10 PRs
    summary.topPRs = prStats
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

    // Get recent views (last 24 hours)
    summary.recentViews = prStats
        .filter(pr => {
            if (!pr.lastView) return false;
            const hoursSince = (Date.now() - new Date(pr.lastView).getTime()) / (1000 * 60 * 60);
            return hoursSince <= 24;
        })
        .sort((a, b) => new Date(b.lastView) - new Date(a.lastView))
        .slice(0, 10);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            summary
        })
    };
}

// Helper functions
function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return url;
    }
}

function getTopItems(items, limit = 5) {
    return Object.entries(items || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, value]) => ({ name: key, count: value }));
}

function getLast30Days(dailyViews) {
    const result = {};
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        result[dateStr] = dailyViews[dateStr] || 0;
    }

    return result;
}

function getPeakHour(hourlyViews) {
    let maxViews = 0;
    let peakHour = 0;

    for (const [hour, views] of Object.entries(hourlyViews || {})) {
        if (views > maxViews) {
            maxViews = views;
            peakHour = parseInt(hour);
        }
    }

    return peakHour;
}

function calculateAverageDailyViews(dailyViews) {
    const values = Object.values(dailyViews || {});
    if (values.length === 0) return 0;

    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
}

function calculateTrend(dailyViews) {
    const dates = Object.keys(dailyViews || {}).sort();
    if (dates.length < 7) return 'insufficient-data';

    // Compare last 7 days to previous 7 days
    const last7Days = dates.slice(-7);
    const previous7Days = dates.slice(-14, -7);

    const last7Sum = last7Days.reduce((sum, date) => sum + (dailyViews[date] || 0), 0);
    const previous7Sum = previous7Days.reduce((sum, date) => sum + (dailyViews[date] || 0), 0);

    if (previous7Sum === 0) return 'new';

    const change = ((last7Sum - previous7Sum) / previous7Sum) * 100;

    if (change > 20) return 'up';
    if (change < -20) return 'down';
    return 'stable';
}

function cleanupOldSessions() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    for (const [sessionId, data] of sessionStore.entries()) {
        const lastSeen = new Date(data.lastSeen).getTime();
        if (lastSeen < thirtyDaysAgo) {
            sessionStore.delete(sessionId);
        }
    }
}

// Export function to get analytics for PR management
exports.getAnalyticsForPR = (slug) => {
    const analytics = analyticsStore.get(slug);
    if (!analytics) return null;

    return {
        views: analytics.views,
        uniqueVisitors: analytics.uniqueSessions.size,
        lastView: analytics.lastView,
        trend: calculateTrend(analytics.dailyViews)
    };
};