const backendClient = require('./backendClient');
const crypto = require('crypto');

/**
 * MCP Usage Logger using Backend Service
 * This replaces the SQLite implementation with calls to the backend-service
 */
class MCPUsageLogger {
    constructor() {
        this.backendClient = backendClient;
    }

    /**
     * Initialize the usage logger (no-op for backend service)
     */
    async initializeDatabase() {
        console.log('MCP Usage Logger initialized with backend-service integration');
        return Promise.resolve();
    }

    /**
     * Log MCP usage to backend-service database
     */
    async logUsage(logData) {
        try {
            const timestamp = new Date().toISOString();
            const {
                requestId,
                apiKeyId,
                toolName,
                requestData,
                responseData,
                statusCode,
                processingTimeMs,
                errorMessage,
                userAgent,
                ipAddress
            } = logData;
            
            console.log(`[${timestamp}] Logging MCP usage for tool: ${toolName}, API key: ${apiKeyId}`);
            
            // Calculate request hash
            const requestString = JSON.stringify(requestData);
            const requestHash = crypto.createHash('sha256').update(requestString).digest('hex');
            
            // Prepare metadata
            const metadata = {
                tool_name: toolName,
                call_id: requestId,
                api_time_ms: processingTimeMs,
                input_length: this.calculateInputLength(requestData),
                output_length: this.calculateOutputLength(responseData),
                status_code: statusCode,
                error_message: errorMessage,
                user_agent: userAgent,
                ip_address: ipAddress,
                input_type: 'MCP'  // Distinguish MCP calls from regular API calls
            };
            
            // Store in backend-service
            const result = await this.backendClient.storeMcpCall(
                requestData,
                responseData,
                apiKeyId,
                requestHash,
                metadata,
                false // not cached
            );
            
            console.log(`[${timestamp}] MCP usage logged successfully with ID: ${result.id}`);
            return result.id;
            
        } catch (error) {
            console.error('Error logging MCP usage:', error);
            // Don't throw error to avoid breaking the main flow
            return null;
        }
    }

    /**
     * Check cache for MCP call
     */
    async checkCache(requestData, requestHash, environment = 'sandbox') {
        try {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Checking MCP cache for hash: ${requestHash}`);
            
            const cachedResult = await this.backendClient.checkMcpCache(
                requestData,
                requestHash,
                environment
            );
            
            if (cachedResult) {
                console.log(`[${timestamp}] Found cached MCP result from ${cachedResult.created_at}`);
                return cachedResult;
            } else {
                console.log(`[${timestamp}] No cached MCP result found`);
                return null;
            }
            
        } catch (error) {
            console.error('Error checking MCP cache:', error);
            return null; // Return null on error to allow processing to continue
        }
    }

    /**
     * Get usage statistics
     */
    async getUsageStats(apiKeyId, startDate = null, endDate = null, environment = 'sandbox') {
        try {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Getting MCP usage stats for API key: ${apiKeyId}`);
            
            const stats = await this.backendClient.getMcpStats(
                apiKeyId,
                startDate,
                endDate,
                environment
            );
            
            console.log(`[${timestamp}] Retrieved MCP usage stats`);
            return stats;
            
        } catch (error) {
            console.error('Error getting MCP usage stats:', error);
            throw error;
        }
    }

    /**
     * Get usage history
     */
    async getUsageHistory(userId, limit = 100, offset = 0, environment = 'sandbox', inputType = null) {
        try {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Getting MCP usage history for user: ${userId}`);
            
            const history = await this.backendClient.getMcpCallHistory(
                userId,
                limit,
                offset,
                environment,
                inputType
            );
            
            console.log(`[${timestamp}] Retrieved MCP usage history`);
            return history;
            
        } catch (error) {
            console.error('Error getting MCP usage history:', error);
            throw error;
        }
    }

    /**
     * Calculate input length for metadata
     */
    calculateInputLength(requestData) {
        try {
            if (typeof requestData === 'string') {
                return requestData.length;
            } else if (typeof requestData === 'object') {
                return JSON.stringify(requestData).length;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Calculate output length for metadata
     */
    calculateOutputLength(responseData) {
        try {
            if (typeof responseData === 'string') {
                return responseData.length;
            } else if (typeof responseData === 'object') {
                return JSON.stringify(responseData).length;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Close database connection (no-op for backend service)
     */
    closeDatabase() {
        console.log('MCP Usage Logger closed (backend-service integration)');
    }
}

// Create singleton instance
const usageLogger = new MCPUsageLogger();

module.exports = {
    initializeDatabase: () => usageLogger.initializeDatabase(),
    logUsage: (logData) => usageLogger.logUsage(logData),
    checkCache: (requestData, requestHash, environment) => 
        usageLogger.checkCache(requestData, requestHash, environment),
    getUsageStats: (apiKeyId, startDate, endDate, environment) => 
        usageLogger.getUsageStats(apiKeyId, startDate, endDate, environment),
    getUsageHistory: (userId, limit, offset, environment) => 
        usageLogger.getUsageHistory(userId, limit, offset, environment),
    closeDatabase: () => usageLogger.closeDatabase()
};