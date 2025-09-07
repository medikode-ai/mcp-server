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
 * Client for communicating with backend-service for MCP call logging
 */
class BackendClient {
    constructor() {
        this.backendUrl = process.env.BACKEND_SERVICE_URL || 'http://localhost:3002';
    }

    /**
     * Store MCP tool call in backend-service database
     */
    async storeMcpCall(requestData, responseData, apiKeyId, requestHash, metadata, cached = false) {
        try {
            const response = await fetch(`${this.backendUrl}/api/mcp-calls/store`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    request_data: requestData,
                    response_data: responseData,
                    api_key_id: apiKeyId,
                    request_hash: requestHash,
                    metadata: metadata,
                    cached: cached
                })
            });

            if (!response.ok) {
                throw new Error(`Backend service error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error storing MCP call in backend service:', error);
            throw error;
        }
    }

    /**
     * Check cache for MCP tool call
     */
    async checkMcpCache(requestData, requestHash, environment = 'sandbox') {
        try {
            const response = await fetch(`${this.backendUrl}/api/mcp-calls/check-cache`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    request_data: requestData,
                    request_hash: requestHash,
                    environment: environment
                })
            });

            if (!response.ok) {
                throw new Error(`Backend service error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            return result.cached ? result.data : null;
        } catch (error) {
            console.error('Error checking MCP cache in backend service:', error);
            return null; // Return null on error to allow processing to continue
        }
    }

    /**
     * Get MCP call history for a user
     */
    async getMcpCallHistory(userId, limit = 10, offset = 0, environment = 'sandbox', inputType = null) {
        try {
            let url = `${this.backendUrl}/api/mcp-calls?limit=${limit}&offset=${offset}&environment=${environment}`;
            if (inputType) {
                url += `&input_type=${inputType}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userId}`, // This would need proper JWT token
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Backend service error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error getting MCP call history from backend service:', error);
            throw error;
        }
    }

    /**
     * Get MCP usage statistics
     */
    async getMcpStats(apiKeyId, startDate, endDate) {
        try {
            const params = new URLSearchParams({
                api_key_id: apiKeyId
            });
            
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await fetch(`${this.backendUrl}/api/mcp-calls/stats?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Backend service error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error getting MCP stats from backend service:', error);
            throw error;
        }
    }
}

module.exports = new BackendClient();
