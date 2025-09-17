const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const { validateApiKey } = require('./src/middleware/auth');
const { initializeDatabase } = require('./src/database/usageLogger');
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
    origin: true, // Allow all origins
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
        version: '1.0.0',
        description: 'Model Context Protocol server for Medikode healthcare SaaS platform',
        endpoints: {
            health: '/health',
            capabilities: '/capabilities',
            mcp: '/mcp',
            mcpJson: '/mcp.json'
        },
        timestamp: new Date().toISOString()
    });
});

// MCP JSON endpoint (no auth required - for MCP discovery)
app.get('/mcp.json', (req, res) => {
    res.json({
        "name": "Medikode MCP Server",
        "version": "1.0.0",
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
