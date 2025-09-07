// Use built-in fetch for Node.js 18+ or fallback to node-fetch
let fetch;
try {
    // Try to use built-in fetch first
    fetch = globalThis.fetch;
    if (!fetch) {
        // Fallback to node-fetch for older Node.js versions
        fetch = require('node-fetch');
    }
} catch (error) {
    // If built-in fetch is not available, use node-fetch
    fetch = require('node-fetch');
}

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
        const backendUrl = process.env.BACKEND_SERVICE_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/api/validate-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apikey: apiKey })
        });

        if (!response.ok) {
            return res.status(401).json({
                error: 'Invalid API key',
                timestamp: new Date().toISOString(),
                service: 'medikode-mcp-server'
            });
        }

        const validationResult = await response.json();
        
        if (!validationResult.valid) {
            return res.status(401).json({
                error: 'Invalid API key',
                timestamp: new Date().toISOString(),
                service: 'medikode-mcp-server'
            });
        }
        
        // Attach API key data to request for use in routes
        req.apiKeyData = validationResult.keyData;
        
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
