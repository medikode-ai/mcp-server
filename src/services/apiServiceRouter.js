// Using built-in fetch (Node.js 24.7.0+)
const fetch = globalThis.fetch;

/**
 * API Service Router - Routes requests to the correct API service based on environment
 */
class ApiServiceRouter {
    constructor() {
        // API service URLs - these will be set based on environment
        this.prodApiUrl = process.env.PROD_API_SERVICE_URL || 'http://api-service:8000';
        this.sandboxApiUrl = process.env.SANDBOX_API_SERVICE_URL || 'http://api-service-sandbox:8000';
    }

    /**
     * Get the correct API service URL based on environment
     */
    getApiServiceUrl(environment) {
        if (environment === 'prod') {
            return this.prodApiUrl;
        } else {
            return this.sandboxApiUrl;
        }
    }

    /**
     * Forward request to the appropriate API service
     */
    async forwardRequest(environment, endpoint, method = 'POST', body = null, headers = {}) {
        try {
            const apiUrl = this.getApiServiceUrl(environment);
            const fullUrl = `${apiUrl}${endpoint}`;
            
            const requestOptions = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (body && (method === 'POST' || method === 'PUT')) {
                requestOptions.body = JSON.stringify(body);
            }

            console.log(`[MCP Router] Forwarding ${method} request to ${fullUrl} (environment: ${environment})`);
            
            const response = await fetch(fullUrl, requestOptions);
            
            if (!response.ok) {
                console.error(`[MCP Router] API service error: ${response.status} ${response.statusText}`);
                throw new Error(`API service error: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log(`[MCP Router] Successfully forwarded request to ${environment} API service`);
            
            return responseData;
        } catch (error) {
            console.error(`[MCP Router] Error forwarding request to ${environment} API service:`, error);
            throw error;
        }
    }

    /**
     * Forward process chart request
     */
    async processChart(environment, requestData, apiKey) {
        return this.forwardRequest(
            environment,
            '/process-chart',
            'POST',
            requestData,
            { 'x-api-key': apiKey }
        );
    }

    /**
     * Forward validate codes request
     */
    async validateCodes(environment, requestData, apiKey) {
        return this.forwardRequest(
            environment,
            '/validate',
            'POST',
            requestData,
            { 'x-api-key': apiKey }
        );
    }

    /**
     * Forward calculate RAF request
     */
    async calculateRaf(environment, requestData, apiKey) {
        return this.forwardRequest(
            environment,
            '/calculate-raf',
            'POST',
            requestData,
            { 'x-api-key': apiKey }
        );
    }

    /**
     * Forward QA validator request
     */
    async qaValidateCodes(environment, requestData, apiKey) {
        return this.forwardRequest(
            environment,
            '/qavalidator',
            'POST',
            requestData,
            { 'x-api-key': apiKey }
        );
    }

    /**
     * Forward EOB parser request
     */
    async parseEob(environment, requestData, apiKey) {
        return this.forwardRequest(
            environment,
            '/eobparser',
            'POST',
            requestData,
            { 'x-api-key': apiKey }
        );
    }
}

module.exports = new ApiServiceRouter();
