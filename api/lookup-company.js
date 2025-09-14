// CRO Company Lookup API Function
// Integrates with Companies Registration Office API

const fetch = require('node-fetch');

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
        const { croNumber, companyName } = JSON.parse(event.body);

        if (!croNumber) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'CRO number is required' })
            };
        }

        // Call CRO OpenData API
        const croApiUrl = `https://opendata.cro.ie/api/3/action/datastore_search?resource_id=3fef41bc-b8f4-4b10-8434-ce51c29b1bba&q=${croNumber}`;

        const response = await fetch(croApiUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'PressWire.ie/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`CRO API returned ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'CRO API error' })
            };
        }

        // Check if company exists
        if (!data.result || !data.result.records || data.result.records.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Company not found',
                    message: `No company found with CRO number ${croNumber}`
                })
            };
        }

        const company = data.result.records[0];

        // Verify company name matches (fuzzy match)
        if (companyName) {
            const normalizedInput = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedCRO = (company.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

            if (!normalizedCRO.includes(normalizedInput) && !normalizedInput.includes(normalizedCRO)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Company name mismatch',
                        message: 'The company name does not match CRO records',
                        croName: company.company_name
                    })
                };
            }
        }

        // Extract relevant company information
        const companyInfo = {
            croNumber: company.company_num || croNumber,
            name: company.company_name || companyName,
            status: company.company_status || 'Unknown',
            type: company.company_type || 'Unknown',
            registrationDate: company.company_reg_date || null,
            address: extractAddress(company),
            verified: true,
            verifiedAt: new Date().toISOString()
        };

        // Additional validation for active companies only
        if (companyInfo.status && companyInfo.status.toLowerCase().includes('dissolved')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Company inactive',
                    message: 'This company appears to be dissolved or inactive',
                    companyInfo
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                company: companyInfo,
                message: 'Company verified successfully'
            })
        };

    } catch (error) {
        console.error('Error looking up company:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'Failed to lookup company information'
            })
        };
    }
};

// Helper function to extract address from CRO data
function extractAddress(company) {
    const addressFields = [
        'company_address_1',
        'company_address_2',
        'company_address_3',
        'company_address_4',
        'company_county',
        'company_country'
    ];

    const addressParts = addressFields
        .map(field => company[field])
        .filter(value => value && value.trim() !== '');

    return addressParts.length > 0 ? addressParts.join(', ') : 'Address not available';
}

// Additional validation functions
function validateCRONumber(croNumber) {
    // CRO numbers are typically 6 digits
    return /^\d{6}$/.test(croNumber);
}

function normalizeCompanyName(name) {
    return name
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/^THE\s+/, '')
        .replace(/\s+(LIMITED|LTD|PLC|DAC|UC|CLG)\.?$/i, '')
        .trim();
}

module.exports.validateCRONumber = validateCRONumber;
module.exports.normalizeCompanyName = normalizeCompanyName;