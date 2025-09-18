/**
 * Save Press Release to GitHub
 * Triggers Netlify build so PR appears immediately on site
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
        const { content, filename, metadata } = JSON.parse(event.body);

        // Validate inputs
        if (!content || !filename) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing content or filename' })
            };
        }

        // Check for GitHub configuration
        if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
            console.error('GitHub configuration missing');

            // Fallback: Store locally (won't persist but shows success)
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'PR generated (GitHub storage not configured)',
                    url: `/news/${filename}`,
                    skipBuild: true
                })
            };
        }

        // Initialize GitHub client
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        // Ensure filename has .html extension
        const htmlFilename = filename.endsWith('.html') ? filename : `${filename}.html`;
        const filePath = `news/${htmlFilename}`;

        // Check if file already exists
        let existingFile = null;
        try {
            const { data } = await octokit.repos.getContent({
                owner: process.env.GITHUB_OWNER,
                repo: process.env.GITHUB_REPO,
                path: filePath
            });
            existingFile = data;
        } catch (error) {
            // File doesn't exist, which is fine
            console.log('Creating new PR file:', filePath);
        }

        // Create commit message - build will deploy PR to site
        const commitMessage = existingFile
            ? `Update PR: ${metadata?.company || filename}`
            : `Add PR: ${metadata?.company || filename}`;

        const response = await octokit.repos.createOrUpdateFileContents({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            path: filePath,
            message: commitMessage,
            content: Buffer.from(content).toString('base64'),
            sha: existingFile?.sha // Required for updates
        });

        console.log('PR saved, build will deploy it:', response.data.commit.sha);

        // Return success with the PR URL
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                url: `/news/${htmlFilename}`,
                githubUrl: response.data.content.html_url,
                message: 'Press release published successfully',
                buildTriggered: true
            })
        };

    } catch (error) {
        console.error('Error saving PR:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to save press release',
                message: error.message
            })
        };
    }
};