const express = require('express');
const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'medikode-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    });
});

/**
 * Detailed health check with dependencies
 */
router.get('/detailed', async (req, res) => {
    const health = {
        status: 'healthy',
        service: 'medikode-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        dependencies: {}
    };

    // Check API service connectivity
    try {
        // Using built-in fetch (Node.js 24.7.0+)
        const apiServiceUrl = process.env.API_SERVICE_URL || 'http://localhost:3001';
        const response = await fetch(`${apiServiceUrl}/health`, { 
            method: 'GET',
            timeout: 5000 
        });
        
        health.dependencies.api_service = {
            status: response.ok ? 'healthy' : 'unhealthy',
            url: apiServiceUrl,
            status_code: response.status
        };
    } catch (error) {
        health.dependencies.api_service = {
            status: 'unhealthy',
            url: process.env.API_SERVICE_URL || 'http://localhost:3001',
            error: error.message
        };
    }

    // Check backend service connectivity
    try {
        // Using built-in fetch (Node.js 24.7.0+)
        const backendServiceUrl = process.env.BACKEND_SERVICE_URL || 'http://localhost:3002';
        const response = await fetch(`${backendServiceUrl}/health`, { 
            method: 'GET',
            timeout: 5000 
        });
        
        health.dependencies.backend_service = {
            status: response.ok ? 'healthy' : 'unhealthy',
            url: backendServiceUrl,
            status_code: response.status
        };
    } catch (error) {
        health.dependencies.backend_service = {
            status: 'unhealthy',
            url: process.env.BACKEND_SERVICE_URL || 'http://localhost:3002',
            error: error.message
        };
    }

    // Check SQLite database
    try {
        const { getUsageStats } = require('../database/usageLogger');
        await getUsageStats('health-check', null, null);
        health.dependencies.database = {
            status: 'healthy',
            type: 'sqlite'
        };
    } catch (error) {
        health.dependencies.database = {
            status: 'unhealthy',
            type: 'sqlite',
            error: error.message
        };
    }

    // Determine overall health status
    const unhealthyDeps = Object.values(health.dependencies).filter(dep => dep.status === 'unhealthy');
    if (unhealthyDeps.length > 0) {
        health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

module.exports = router;
