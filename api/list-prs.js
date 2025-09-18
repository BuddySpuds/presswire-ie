/**
 * List Press Releases API
 * Returns list of PRs from GitHub for dynamic display
 */

const { Octokit } = require('@octokit/rest');

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
        // Get query parameters
        const params = event.queryStringParameters || {};
        const limit = parseInt(params.limit) || 20;
        const offset = parseInt(params.offset) || 0;

        // Check GitHub configuration
        if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
            // Return demo data if GitHub not configured
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    prs: getDemoPRs(),
                    total: 3,
                    hasMore: false
                })
            };
        }

        // Initialize GitHub client
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        // Get list of PRs from GitHub
        const { data: files } = await octokit.repos.getContent({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            path: 'news'
        });

        // Filter HTML files and sort by date (newest first)
        const prFiles = files
            .filter(file => file.name.endsWith('.html') && file.name !== 'index.html')
            .sort((a, b) => {
                // Extract timestamp from filename if present
                const aTime = extractTimestamp(a.name);
                const bTime = extractTimestamp(b.name);
                return bTime - aTime;
            });

        // Extract PR metadata from filenames
        const prs = prFiles.slice(offset, offset + limit).map(file => {
            const timestamp = extractTimestamp(file.name);
            const company = extractCompany(file.name);

            return {
                filename: file.name,
                url: `/news/${file.name}`,
                company: company,
                timestamp: timestamp,
                date: new Date(timestamp).toLocaleDateString('en-IE'),
                timeAgo: getTimeAgo(timestamp)
            };
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                prs: prs,
                total: prFiles.length,
                hasMore: offset + limit < prFiles.length
            })
        };

    } catch (error) {
        console.error('Error listing PRs:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to list press releases',
                message: error.message
            })
        };
    }
};

function extractTimestamp(filename) {
    // Extract timestamp from filename like "company-1758193043762.html"
    const match = filename.match(/(\d{13})\.html$/);
    return match ? parseInt(match[1]) : Date.now();
}

function extractCompany(filename) {
    // Extract company name from filename
    const name = filename.replace(/[-_]/g, ' ')
                        .replace(/\d{13}\.html$/, '')
                        .replace(/\.html$/, '');
    return name.split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1))
               .join(' ');
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function getDemoPRs() {
    return [
        {
            filename: 'techcorp-expansion.html',
            url: '/news/techcorp-expansion.html',
            company: 'TechCorp Ireland',
            title: 'TechCorp Ireland Announces €5M Expansion',
            date: '2 hours ago',
            verified: true,
            domain: 'techcorp.ie',
            industry: 'technology'
        },
        {
            filename: 'greenenergy-grant.html',
            url: '/news/greenenergy-grant.html',
            company: 'GreenEnergy Solutions',
            title: 'GreenEnergy Solutions Wins EU Grant',
            date: '4 hours ago',
            verified: true,
            domain: 'greenenergy.ie',
            industry: 'renewable'
        },
        {
            filename: 'fintech-series-a.html',
            url: '/news/fintech-series-a.html',
            company: 'FinTech Startup',
            title: 'FinTech Startup Raises €10M Series A',
            date: 'Yesterday',
            verified: true,
            domain: 'fintech.ie',
            industry: 'finance'
        }
    ];
}