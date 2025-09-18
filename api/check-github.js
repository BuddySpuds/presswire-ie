/**
 * GitHub Configuration Checker
 * Diagnostic endpoint to verify GitHub is properly configured
 */

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Check environment variables
    const config = {
        hasToken: !!process.env.GITHUB_TOKEN,
        tokenLength: process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.length : 0,
        owner: process.env.GITHUB_OWNER || 'Not set',
        repo: process.env.GITHUB_REPO || 'Not set',
        hasEmail: !!process.env.SMTP_HOST,
        emailHost: process.env.SMTP_HOST || 'Not configured'
    };

    // Try to verify GitHub access if token exists
    let githubAccess = false;
    let githubError = null;

    if (config.hasToken) {
        try {
            const { Octokit } = require('@octokit/rest');
            const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

            // Try to get repo info
            const repo = await octokit.repos.get({
                owner: process.env.GITHUB_OWNER || 'BuddySpuds',
                repo: process.env.GITHUB_REPO || 'presswire-ie'
            });

            githubAccess = true;
            config.repoName = repo.data.full_name;
            config.repoPrivate = repo.data.private;
        } catch (error) {
            githubError = error.message;
        }
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            github: {
                configured: config.hasToken,
                accessible: githubAccess,
                error: githubError,
                owner: config.owner,
                repo: config.repo,
                tokenLength: config.tokenLength
            },
            email: {
                configured: config.hasEmail,
                host: config.emailHost
            },
            recommendation: !config.hasToken ?
                "Add GITHUB_TOKEN to Netlify environment variables" :
                !githubAccess ?
                "Check GitHub token permissions (needs 'repo' scope)" :
                "GitHub is properly configured"
        }, null, 2)
    };
};