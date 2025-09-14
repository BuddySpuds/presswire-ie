// Local development server for testing API functions
// This simulates Netlify Functions locally

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Import API handlers
const verifyDomain = require('./api/verify-domain');
const lookupCompany = require('./api/lookup-company');
const generatePR = require('./api/generate-pr');

// API Routes
app.post('/api/verify-domain', async (req, res) => {
    const event = {
        httpMethod: 'POST',
        headers: req.headers,
        body: JSON.stringify(req.body)
    };

    const response = await verifyDomain.handler(event);
    res.status(response.statusCode).json(JSON.parse(response.body));
});

app.post('/api/lookup-company', async (req, res) => {
    const event = {
        httpMethod: 'POST',
        headers: req.headers,
        body: JSON.stringify(req.body)
    };

    const response = await lookupCompany.handler(event);
    res.status(response.statusCode).json(JSON.parse(response.body));
});

app.post('/api/generate-pr', async (req, res) => {
    const event = {
        httpMethod: 'POST',
        headers: req.headers,
        body: JSON.stringify(req.body)
    };

    const response = await generatePR.handler(event);
    res.status(response.statusCode).json(JSON.parse(response.body));
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/generate', (req, res) => {
    res.sendFile(path.join(__dirname, 'generate.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🚀 PressWire.ie Development Server
    ==================================

    Frontend:    http://localhost:${PORT}
    Generate PR: http://localhost:${PORT}/generate.html
    API Base:    http://localhost:${PORT}/api

    Test with:   npm test

    Press Ctrl+C to stop
    `);
});