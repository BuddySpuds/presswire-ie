// PR Management API
// Allows users to edit, unpublish, and view analytics for their press releases

const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');

// In-memory storage (will be replaced with GitHub storage)
const prDatabase = new Map();
const analyticsData = new Map();

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { action, managementToken, data } = JSON.parse(event.body || '{}');

        // Validate management token
        if (!managementToken) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Management token required' })
            };
        }

        // Get PR from database
        const pr = await getPRByToken(managementToken);
        if (!pr) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Invalid or expired management token' })
            };
        }

        switch (action) {
            case 'get-pr':
                return handleGetPR(pr, headers);

            case 'edit-pr':
                return handleEditPR(pr, data, headers);

            case 'unpublish-pr':
                return handleUnpublishPR(pr, headers);

            case 'get-analytics':
                return handleGetAnalytics(pr, headers);

            case 'extend-pr':
                return handleExtendPR(pr, data, headers);

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }

    } catch (error) {
        console.error('PR Management error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

async function getPRByToken(token) {
    // For now, use in-memory storage
    // In production, fetch from GitHub data/prs.json
    const pr = prDatabase.get(token);

    if (!pr) {
        // Try to load from GitHub if available
        if (process.env.GITHUB_TOKEN) {
            return await fetchPRFromGitHub(token);
        }
        return null;
    }

    // Check if token is expired (7 days for management)
    const tokenAge = Date.now() - new Date(pr.createdAt).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (tokenAge > sevenDays && !pr.extended) {
        return null; // Token expired
    }

    return pr;
}

async function fetchPRFromGitHub(token) {
    if (!process.env.GITHUB_TOKEN) return null;

    try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        const { data } = await octokit.repos.getContent({
            owner: process.env.GITHUB_OWNER || 'BuddySpuds',
            repo: process.env.GITHUB_REPO || 'presswire-ie',
            path: 'data/prs.json'
        });

        const content = Buffer.from(data.content, 'base64').toString();
        const prs = JSON.parse(content);

        return prs[token] || null;
    } catch (error) {
        console.error('Failed to fetch PR from GitHub:', error);
        return null;
    }
}

function handleGetPR(pr, headers) {
    // Remove sensitive data before sending
    const { managementToken, ...publicData } = pr;

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            pr: {
                ...publicData,
                canEdit: isEditable(pr),
                editDeadline: getEditDeadline(pr)
            }
        })
    };
}

function handleEditPR(pr, updates, headers) {
    // Check if PR is still editable (24 hours after creation)
    if (!isEditable(pr)) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
                error: 'Edit period has expired',
                message: 'PRs can only be edited within 24 hours of publication'
            })
        };
    }

    // Validate updates
    const allowedFields = ['headline', 'summary', 'content', 'contact'];
    const validUpdates = {};

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            validUpdates[field] = updates[field];
        }
    }

    if (Object.keys(validUpdates).length === 0) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No valid updates provided' })
        };
    }

    // Update PR
    Object.assign(pr, validUpdates);
    pr.lastEdited = new Date().toISOString();
    pr.editCount = (pr.editCount || 0) + 1;

    // Save to database
    prDatabase.set(pr.managementToken, pr);

    // Update GitHub if configured
    if (process.env.GITHUB_TOKEN) {
        updatePRInGitHub(pr);
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Press release updated successfully',
            pr: {
                slug: pr.slug,
                url: pr.url,
                lastEdited: pr.lastEdited,
                editCount: pr.editCount
            }
        })
    };
}

function handleUnpublishPR(pr, headers) {
    // Mark PR as unpublished
    pr.published = false;
    pr.unpublishedAt = new Date().toISOString();
    pr.unpublishReason = 'User requested';

    // Save to database
    prDatabase.set(pr.managementToken, pr);

    // Update GitHub if configured
    if (process.env.GITHUB_TOKEN) {
        unpublishPRInGitHub(pr);
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Press release has been unpublished',
            pr: {
                slug: pr.slug,
                unpublishedAt: pr.unpublishedAt
            }
        })
    };
}

function handleGetAnalytics(pr, headers) {
    // Get analytics for this PR
    const analytics = analyticsData.get(pr.slug) || {
        views: 0,
        uniqueVisitors: 0,
        referrers: {},
        dailyViews: {},
        lastUpdated: new Date().toISOString()
    };

    // Calculate engagement metrics
    const publishedDays = Math.floor(
        (Date.now() - new Date(pr.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    );

    const averageDaily = publishedDays > 0 ? Math.round(analytics.views / publishedDays) : 0;

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            analytics: {
                totalViews: analytics.views,
                uniqueVisitors: analytics.uniqueVisitors,
                averageDailyViews: averageDaily,
                publishedDays,
                topReferrers: getTopReferrers(analytics.referrers),
                viewsByDay: analytics.dailyViews,
                lastUpdated: analytics.lastUpdated
            }
        })
    };
}

function handleExtendPR(pr, data, headers) {
    // Allow extending PR management period (requires payment)
    const { extensionDays = 30, paymentToken } = data || {};

    // In production, verify payment token with Stripe
    if (!paymentToken && process.env.NODE_ENV !== 'development') {
        return {
            statusCode: 402,
            headers,
            body: JSON.stringify({
                error: 'Payment required',
                message: 'Extension requires payment',
                price: '€29',
                extensionDays: 30
            })
        };
    }

    // Extend management period
    pr.extended = true;
    pr.extensionDate = new Date().toISOString();
    pr.expiresAt = new Date(Date.now() + (extensionDays * 24 * 60 * 60 * 1000)).toISOString();

    // Save to database
    prDatabase.set(pr.managementToken, pr);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: `PR management extended by ${extensionDays} days`,
            expiresAt: pr.expiresAt
        })
    };
}

// Helper functions
function isEditable(pr) {
    const createdAt = new Date(pr.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
    return hoursSinceCreation <= 24;
}

function getEditDeadline(pr) {
    const createdAt = new Date(pr.createdAt);
    const deadline = new Date(createdAt.getTime() + (24 * 60 * 60 * 1000));
    return deadline.toISOString();
}

function getTopReferrers(referrers) {
    const sorted = Object.entries(referrers || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return sorted.map(([url, count]) => ({ url, count }));
}

async function updatePRInGitHub(pr) {
    // Update PR HTML file in GitHub
    // This would regenerate the HTML with new content
    console.log('Updating PR in GitHub:', pr.slug);
}

async function unpublishPRInGitHub(pr) {
    // Remove or update PR HTML file in GitHub
    console.log('Unpublishing PR in GitHub:', pr.slug);
}

// Export helper function to save PR on creation
exports.savePR = (pr) => {
    const managementToken = crypto.randomBytes(32).toString('hex');
    const prData = {
        ...pr,
        managementToken,
        createdAt: new Date().toISOString(),
        published: true,
        editCount: 0
    };

    prDatabase.set(managementToken, prData);
    return managementToken;
};