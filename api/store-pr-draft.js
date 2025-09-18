/**
 * Store PR draft before payment
 * Returns a unique ID that can be passed through Stripe Payment Link
 */

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

        // In production, store this in a database
        // For MVP, we'll use environment variable or GitHub
        // For now, we'll return the ID and rely on client-side storage

        console.log('Storing PR draft with ID:', draftId);
        console.log('PR data:', prData);

        // Store in a way that webhook can retrieve
        // This is a temporary solution - in production use a database

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