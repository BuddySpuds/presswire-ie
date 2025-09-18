/**
 * Retrieve PR draft by ID
 * Used by webhook after payment succeeds to get PR data
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

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get draft ID from query params
        const draftId = event.queryStringParameters?.id;

        if (!draftId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Draft ID required' })
            };
        }

        console.log('Retrieving PR draft with ID:', draftId);

        // Retrieve draft from GitHub
        if (process.env.GITHUB_TOKEN) {
            try {
                const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

                const response = await octokit.repos.getContent({
                    owner: process.env.GITHUB_OWNER || 'BuddySpuds',
                    repo: process.env.GITHUB_REPO || 'presswire-ie',
                    path: `drafts/${draftId}.json`
                });

                // Decode the content
                const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                const draft = JSON.parse(content);

                // Check if draft is expired
                if (draft.expiresAt && new Date(draft.expiresAt) < new Date()) {
                    // Delete expired draft
                    await octokit.repos.deleteFile({
                        owner: process.env.GITHUB_OWNER || 'BuddySpuds',
                        repo: process.env.GITHUB_REPO || 'presswire-ie',
                        path: `drafts/${draftId}.json`,
                        message: `Delete expired draft ${draftId}`,
                        sha: response.data.sha
                    });

                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: 'Draft expired' })
                    };
                }

                console.log('Draft retrieved successfully');

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        draft: draft.data,
                        createdAt: draft.createdAt
                    })
                };

            } catch (gitError) {
                console.error('Failed to retrieve from GitHub:', gitError);
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Draft not found' })
                };
            }
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Draft storage not configured' })
        };

    } catch (error) {
        console.error('Error retrieving draft:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to retrieve draft',
                message: error.message
            })
        };
    }
};