/**
 * Store PR draft before payment
 * Saves draft to GitHub and returns a unique ID that can be passed through Stripe Payment Link
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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const prData = JSON.parse(event.body);

        // Generate unique draft ID
        const draftId = 'draft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        console.log('Storing PR draft with ID:', draftId);
        console.log('PR data:', prData);

        // Store draft to GitHub for retrieval after payment
        if (process.env.GITHUB_TOKEN) {
            try {
                const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

                // Store as JSON file in drafts directory
                const draftContent = JSON.stringify({
                    id: draftId,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                    data: prData
                }, null, 2);

                await octokit.repos.createOrUpdateFileContents({
                    owner: process.env.GITHUB_OWNER || 'BuddySpuds',
                    repo: process.env.GITHUB_REPO || 'presswire-ie',
                    path: `drafts/${draftId}.json`,
                    message: `Store PR draft ${draftId}`,
                    content: Buffer.from(draftContent).toString('base64'),
                    branch: 'main'
                });

                console.log('Draft stored to GitHub successfully');
            } catch (gitError) {
                console.error('Failed to store to GitHub:', gitError);
                // Continue anyway - draft ID can still be used
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                draftId: draftId,
                message: 'Draft stored successfully'
            })
        };

    } catch (error) {
        console.error('Error storing draft:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to store draft',
                message: error.message
            })
        };
    }
};