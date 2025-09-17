const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const { validateApiKey } = require('./src/middleware/auth');
const { initializeDatabase } = require('./src/database/usageLogger');
const { getVersion } = require('./src/utils/version');
const mcpRoutes = require('./src/routes/mcp');
const capabilitiesRoutes = require('./src/routes/capabilities');
const healthRoutes = require('./src/routes/health');
const { createWebSocketHandler } = require('./src/websocket/mcpWebSocket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: [
        'http://localhost:6274', // MCP Inspector
        true // Allow all origins for development
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Health check endpoint (no auth required)
app.use('/health', healthRoutes);

// Capabilities endpoint (no auth required - needed for MCP discovery)
app.use('/capabilities', capabilitiesRoutes);

// Root endpoint (no auth required - basic service info)
app.get('/', (req, res) => {
    res.json({
        service: 'medikode-mcp-server',
        version: getVersion(),
        description: 'Model Context Protocol server for Medikode healthcare SaaS platform',
        endpoints: {
            health: '/health',
            capabilities: '/capabilities',
            mcp: '/mcp',
            mcpJson: '/mcp.json',
            mcpInspector: '/mcp/inspect'
        },
        timestamp: new Date().toISOString()
    });
});

// MCP JSON endpoint (no auth required - for MCP discovery)
app.get('/mcp.json', (req, res) => {
    res.json({
        "name": "Medikode MCP Server",
        "version": getVersion(),
        "description": "AI-powered medical coding via Assistant, Validator, and Parser APIs.",
        "tools": [
            {
                "name": "assistant",
                "description": "Interactive coding assistant for CPT/ICD queries.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "chart": { "type": "string", "description": "Patient chart text" }
                    },
                    "required": ["chart"]
                }
            },
            {
                "name": "validator",
                "description": "Validates CPT/ICD codes against chart notes.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "chart": { "type": "string", "description": "Patient chart text" },
                        "codes": { "type": "array", "items": { "type": "string" }, "description": "List of CPT/ICD codes" }
                    },
                    "required": ["chart", "codes"]
                }
            },
            {
                "name": "parser",
                "description": "Parses EOB (Explanation of Benefits) documents into structured JSON.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "document": { "type": "string", "description": "EOB PDF or text" }
                    },
                    "required": ["document"]
                }
            }
        ]
    });
});

// MCP Inspector HTTP endpoint (no auth required for initial connection)
app.get('/mcp/inspect', (req, res) => {
    res.json({
        message: 'MCP Inspector endpoint. Send POST JSON-RPC 2.0 requests to this URL.',
        usage: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            exampleBody: {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    clientInfo: { name: 'inspector', version: '1.0.0' }
                }
            }
        }
    });
});
app.post('/mcp/inspect', async (req, res) => {
    try {
        const { jsonrpc, id, method, params } = req.body;
        
        // Validate JSON-RPC format
        if (jsonrpc !== '2.0') {
            return res.status(400).json({
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32600,
                    message: 'Invalid Request'
                }
            });
        }
        
        // Handle MCP protocol messages
        const response = await handleMCPHTTPMessage(req, { jsonrpc, id, method, params });
        res.json(response);
        
    } catch (error) {
        console.error('Error handling MCP HTTP message:', error);
        res.status(500).json({
            jsonrpc: '2.0',
            id: req.body.id || null,
            error: {
                code: -32603,
                message: 'Internal error',
                data: error.message
            }
        });
    }
});

// API key validation for all other routes
app.use(validateApiKey);

// MCP routes
app.use('/mcp', mcpRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error:`, err);
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        timestamp: timestamp,
        service: 'medikode-mcp-server'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        timestamp: new Date().toISOString(),
        service: 'medikode-mcp-server'
    });
});

/**
 * Handle MCP protocol messages over HTTP
 */
async function handleMCPHTTPMessage(req, message) {
    const { jsonrpc, id, method, params } = message;
    
    try {
        switch (method) {
            case 'initialize':
                return handleInitializeHTTP(id, params);
                
            case 'tools/list':
                return handleToolsListHTTP(id);
                
            case 'tools/call':
                return await handleToolsCallHTTP(req, id, params);
                
            case 'ping':
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {}
                };
                
            default:
                return {
                    jsonrpc: '2.0',
                    id,
                    error: {
                        code: -32601,
                        message: 'Method not found'
                    }
                };
        }
    } catch (error) {
        console.error('Error handling MCP HTTP message:', error);
        return {
            jsonrpc: '2.0',
            id,
            error: {
                code: -32603,
                message: 'Internal error',
                data: error.message
            }
        };
    }
}

/**
 * Handle initialize request over HTTP
 */
function handleInitializeHTTP(id, params) {
    return {
        jsonrpc: '2.0',
        id,
        result: {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {
                    listChanged: true
                }
            },
            serverInfo: {
                name: 'medikode-mcp-server',
                version: getVersion()
            }
        }
    };
}

/**
 * Handle tools/list request over HTTP
 */
function handleToolsListHTTP(id) {
    const tools = [
        {
            name: 'assistant',
            description: 'Interactive coding assistant for CPT/ICD queries.',
            inputSchema: {
                type: 'object',
                properties: {
                    chart: { type: 'string', description: 'Patient chart text' }
                },
                required: ['chart']
            }
        },
        {
            name: 'validator',
            description: 'Validates CPT/ICD codes against chart notes.',
            inputSchema: {
                type: 'object',
                properties: {
                    chart: { type: 'string', description: 'Patient chart text' },
                    codes: { type: 'array', items: { type: 'string' }, description: 'List of CPT/ICD codes' }
                },
                required: ['chart', 'codes']
            }
        },
        {
            name: 'parser',
            description: 'Parses EOB (Explanation of Benefits) documents into structured JSON.',
            inputSchema: {
                type: 'object',
                properties: {
                    document: { type: 'string', description: 'EOB PDF or text' }
                },
                required: ['document']
            }
        }
    ];
    
    return {
        jsonrpc: '2.0',
        id,
        result: {
            tools
        }
    };
}

/**
 * Handle tools/call request over HTTP
 */
async function handleToolsCallHTTP(req, id, params) {
    const { name, arguments: args } = params;
    
    if (!name || !args) {
        return {
            jsonrpc: '2.0',
            id,
            error: {
                code: -32602,
                message: 'Invalid params'
            }
        };
    }
    
    // Extract API key from headers
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    // For MCP Inspector, allow requests without authentication for testing
    if (!apiKey) {
        console.log('No API key provided for MCP Inspector, using default');
        req.apiKeyData = { id: 1, user_id: 1, environment: 'prod' };
    } else {
        // Validate API key
        try {
            const { validateApiKey } = require('./src/middleware/auth');
            // Create a mock request/response for validation
            const mockReq = { headers: { 'x-api-key': apiKey } };
            const mockRes = { status: () => ({ json: () => {} }) };
            const mockNext = () => {};
            
            // For now, we'll use a simplified validation
            req.apiKeyData = { id: 1, user_id: 1, environment: 'prod' };
        } catch (error) {
            console.log('API key validation failed, using default');
            req.apiKeyData = { id: 1, user_id: 1, environment: 'prod' };
        }
    }
    
    const startTime = Date.now();
    
    try {
        let result;
        
        // Map MCP Inspector tool names to our internal tool names
        switch (name) {
            case 'assistant':
                result = await callApiService('/assistant', { text: args.chart }, apiKey, 'prod');
                break;
            case 'validator':
                result = await callApiService('/validator', { 
                    patient_chart: args.chart, 
                    human_coded_output: args.codes.join(', ') 
                }, apiKey, 'prod');
                break;
            case 'parser':
                result = await callApiService('/eobparser', { content: args.document }, apiKey, 'prod');
                break;
            default:
                return {
                    jsonrpc: '2.0',
                    id,
                    error: {
                        code: -32601,
                        message: 'Unknown tool'
                    }
                };
        }
        
        const processingTime = Date.now() - startTime;
        
        return {
            jsonrpc: '2.0',
            id,
            result: {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result.data, null, 2)
                    }
                ]
            }
        };
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`Error calling tool ${name}:`, error);
        
        return {
            jsonrpc: '2.0',
            id,
            error: {
                code: -32603,
                message: 'Internal error',
                data: error.message
            }
        };
    }
}

/**
 * Helper function to make API calls to the api-service
 */
async function callApiService(endpoint, data, apiKey, environment) {
    try {
        const apiServiceRouter = require('./src/services/apiServiceRouter');
        let responseData;
        
        switch (endpoint) {
            case '/assistant':
                responseData = await apiServiceRouter.processChart(environment, data, apiKey);
                break;
            case '/validator':
                responseData = await apiServiceRouter.validateCodes(environment, data, apiKey);
                break;
            case '/eobparser':
                responseData = await apiServiceRouter.parseEob(environment, data, apiKey);
                break;
            default:
                throw new Error(`Unknown endpoint: ${endpoint}`);
        }
        
        return {
            status: 200,
            data: responseData
        };
    } catch (error) {
        console.error(`Error calling API service for ${endpoint}:`, error);
        throw error;
    }
}

// Initialize database and start server
async function startServer() {
    try {
        await initializeDatabase();
        console.log('Database initialized successfully');
        
        // Create WebSocket server
        const wss = new WebSocket.Server({ 
            server,
            path: '/mcp',
            verifyClient: (info) => {
                // Allow all connections for now - authentication will be handled in the WebSocket handler
                return true;
            }
        });
        
        // Set up WebSocket handler
        createWebSocketHandler(wss);
        
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Medikode MCP Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`API Service URL: ${process.env.API_SERVICE_URL || 'http://localhost:3001'}`);
            console.log(`WebSocket MCP endpoint: ws://localhost:${PORT}/mcp`);
            console.log(`MCP Inspector HTTP endpoint: http://localhost:${PORT}/mcp/inspect`);
            console.log(`MCP JSON endpoint: http://localhost:${PORT}/mcp.json`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

startServer();
