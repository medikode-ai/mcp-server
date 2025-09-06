const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Initialize SQLite database for usage logging
 */
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../data/usage.db');
        
        // Ensure data directory exists
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');
            createTables().then(resolve).catch(reject);
        });
    });
}

/**
 * Create necessary tables for usage logging
 */
async function createTables() {
    return new Promise((resolve, reject) => {
        const createUsageTable = `
            CREATE TABLE IF NOT EXISTS mcp_usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT UNIQUE NOT NULL,
                api_key_id TEXT NOT NULL,
                tool_name TEXT NOT NULL,
                request_data TEXT NOT NULL,
                response_data TEXT,
                status_code INTEGER,
                processing_time_ms INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                error_message TEXT,
                user_agent TEXT,
                ip_address TEXT
            )
        `;

        const createIndexes = [
            'CREATE INDEX IF NOT EXISTS idx_mcp_usage_api_key ON mcp_usage_logs(api_key_id)',
            'CREATE INDEX IF NOT EXISTS idx_mcp_usage_tool ON mcp_usage_logs(tool_name)',
            'CREATE INDEX IF NOT EXISTS idx_mcp_usage_timestamp ON mcp_usage_logs(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_mcp_usage_request_id ON mcp_usage_logs(request_id)'
        ];

        db.run(createUsageTable, (err) => {
            if (err) {
                console.error('Error creating usage table:', err);
                reject(err);
                return;
            }

            // Create indexes
            let completed = 0;
            const total = createIndexes.length;

            createIndexes.forEach((indexSql) => {
                db.run(indexSql, (err) => {
                    if (err) {
                        console.error('Error creating index:', err);
                        reject(err);
                        return;
                    }
                    completed++;
                    if (completed === total) {
                        console.log('Database tables and indexes created successfully');
                        resolve();
                    }
                });
            });
        });
    });
}

/**
 * Log MCP tool usage
 */
async function logUsage(logData) {
    return new Promise((resolve, reject) => {
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

        const sql = `
            INSERT INTO mcp_usage_logs (
                request_id, api_key_id, tool_name, request_data, response_data,
                status_code, processing_time_ms, error_message, user_agent, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            requestId,
            apiKeyId,
            toolName,
            JSON.stringify(requestData),
            responseData ? JSON.stringify(responseData) : null,
            statusCode,
            processingTimeMs,
            errorMessage,
            userAgent,
            ipAddress
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error logging usage:', err);
                reject(err);
            } else {
                console.log(`Usage logged for request ${requestId}`);
                resolve(this.lastID);
            }
        });
    });
}

/**
 * Get usage statistics
 */
async function getUsageStats(apiKeyId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        let sql = `
            SELECT 
                tool_name,
                COUNT(*) as total_requests,
                AVG(processing_time_ms) as avg_processing_time,
                COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_requests,
                COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests
            FROM mcp_usage_logs 
            WHERE api_key_id = ?
        `;
        
        const params = [apiKeyId];

        if (startDate) {
            sql += ' AND timestamp >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND timestamp <= ?';
            params.push(endDate);
        }

        sql += ' GROUP BY tool_name ORDER BY total_requests DESC';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error getting usage stats:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Close database connection
 */
function closeDatabase() {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

module.exports = {
    initializeDatabase,
    logUsage,
    getUsageStats,
    closeDatabase
};
