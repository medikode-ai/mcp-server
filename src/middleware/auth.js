const fetch = require('node-fetch');

/**
 * Middleware to validate API key by checking with the backend service
 */
async function validateApiKey(req, res, next) {
    try {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({
                error: 'API key required',
                timestamp: new Date().toISOString(),
                service: 'medikode-mcp-server'
            });
        }

        // Validate API key with backend service
        const backendUrl = process.env.BACKEND_SERVICE_URL || 'http://localhost:3002';
        const response = await fetch(`${backendUrl}/api/validate-api-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({ api_key: apiKey })
        });

        if (!response.ok) {
            return res.status(401).json({
                error: 'Invalid API key',
                timestamp: new Date().toISOString(),
                service: 'medikode-mcp-server'
            });
        }

        const apiKeyData = await response.json();
        
        // Attach API key data to request for use in routes
        req.apiKeyData = apiKeyData;
        
        next();
    } catch (error) {
        console.error('API key validation error:', error);
        return res.status(500).json({
            error: 'API key validation failed',
            timestamp: new Date().toISOString(),
            service: 'medikode-mcp-server'
        });
    }
}

module.exports = {
    validateApiKey
};
