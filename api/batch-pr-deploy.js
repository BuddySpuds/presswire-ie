/**
 * Batch PR Deployment Strategy
 * Instead of deploying immediately, batch PRs and deploy periodically
 */

const { Octokit } = require('@octokit/rest');

// Store pending PRs in memory (or Redis in production)
let pendingPRs = [];
let lastDeployTime = Date.now();

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { action, prData } = JSON.parse(event.body || '{}');

        if (action === 'queue') {
            // Add PR to queue
            pendingPRs.push(prData);

            // Check if we should deploy (every 5 minutes or 5+ PRs)
            const shouldDeploy =
                pendingPRs.length >= 5 ||
                (Date.now() - lastDeployTime) > 5 * 60 * 1000;

            if (shouldDeploy) {
                await deployBatch();
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    queued: true,
                    willDeployAt: shouldDeploy ? 'now' : 'within 5 minutes',
                    queueSize: pendingPRs.length
                })
            };
        }

        if (action === 'force-deploy') {
            await deployBatch();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    deployed: true,
                    count: pendingPRs.length
                })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
        };

    } catch (error) {
        console.error('Batch deploy error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function deployBatch() {
    if (pendingPRs.length === 0) return;

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    // Commit all PRs in one batch
    const files = pendingPRs.map(pr => ({
        path: `news/${pr.slug}.html`,
        content: pr.content
    }));

    try {
        // Get current tree
        const { data: ref } = await octokit.git.getRef({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            ref: 'heads/main'
        });

        const commitSha = ref.object.sha;

        // Create blobs for each file
        const blobs = await Promise.all(
            files.map(file =>
                octokit.git.createBlob({
                    owner: process.env.GITHUB_OWNER,
                    repo: process.env.GITHUB_REPO,
                    content: Buffer.from(file.content).toString('base64'),
                    encoding: 'base64'
                })
            )
        );

        // Create tree
        const tree = files.map((file, index) => ({
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blobs[index].data.sha
        }));

        const { data: newTree } = await octokit.git.createTree({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            tree,
            base_tree: commitSha
        });

        // Create commit
        const { data: newCommit } = await octokit.git.createCommit({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            message: `Batch deploy: ${pendingPRs.length} press releases`,
            tree: newTree.sha,
            parents: [commitSha]
        });

        // Update ref
        await octokit.git.updateRef({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            ref: 'heads/main',
            sha: newCommit.sha
        });

        console.log(`Batch deployed ${pendingPRs.length} PRs in single commit`);

        // Clear queue and update time
        pendingPRs = [];
        lastDeployTime = Date.now();

    } catch (error) {
        console.error('Batch deploy failed:', error);
        throw error;
    }
}

// Auto-deploy every 5 minutes if there are pending PRs
setInterval(async () => {
    if (pendingPRs.length > 0) {
        console.log(`Auto-deploying ${pendingPRs.length} pending PRs`);
        await deployBatch();
    }
}, 5 * 60 * 1000);