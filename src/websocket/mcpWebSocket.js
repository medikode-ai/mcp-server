const { validateApiKey } = require('../middleware/auth');
const apiServiceRouter = require('../services/apiServiceRouter');
const { logUsage } = require('../database/usageLogger');

/**
 * Create WebSocket handler for MCP protocol
 */
function createWebSocketHandler(wss) {
    wss.on('connection', (ws, req) => {
        console.log('New WebSocket connection established');
        
        // Store connection metadata
        ws.isAlive = true;
        ws.requestId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Handle pong responses for keep-alive
        ws.on('pong', () => {
            ws.isAlive = true;
        });
        
        // Handle incoming messages
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('Received WebSocket message:', message);
                
                // Handle MCP protocol messages
                const response = await handleMCPMessage(ws, message, req);
                
                if (response) {
                    ws.send(JSON.stringify(response));
                }
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
                ws.send(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32600,
                        message: 'Invalid Request',
                        data: error.message
                    }
                }));
            }
        });
        
        // Handle connection close
        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });
        
        // Handle errors
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
        
        // Send initial capabilities
        ws.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'notifications/initialized',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {
                        listChanged: true
                    }
                },
                serverInfo: {
                    name: 'medikode-mcp-server',
                    version: '1.0.0'
                }
            }
        }));
    });
    
    // Keep-alive ping every 30 seconds
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                console.log('Terminating dead WebSocket connection');
                return ws.terminate();
            }
            
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);
    
    wss.on('close', () => {
        clearInterval(interval);
    });
}

/**
 * Handle MCP protocol messages
 */
async function handleMCPMessage(ws, message, req) {
    const { jsonrpc, id, method, params } = message;
    
    // Validate JSON-RPC format
    if (jsonrpc !== '2.0') {
        return {
            jsonrpc: '2.0',
            id,
            error: {
                code: -32600,
                message: 'Invalid Request'
            }
        };
    }
    
    try {
        switch (method) {
            case 'initialize':
                return handleInitialize(id, params);
                
            case 'tools/list':
                return handleToolsList(id);
                
            case 'tools/call':
                return await handleToolsCall(ws, id, params, req);
                
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
        console.error('Error handling MCP message:', error);
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
 * Handle initialize request
 */
function handleInitialize(id, params) {
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
                version: '1.0.0'
            }
        }
    };
}

/**
 * Handle tools/list request
 */
function handleToolsList(id) {
    const tools = [
        {
            name: 'process_chart',
            description: 'Process patient chart text and return ICD/CPT code suggestions',
            inputSchema: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'Patient chart text'
                    },
                    specialty: {
                        type: 'string',
                        enum: ['Cardiology', 'Physical Therapy', 'Internal Medicine', 'Urology', 'Family Medicine', 'Neurology']
                    },
                    taxonomy_code: {
                        type: 'string',
                        description: 'Taxonomy code'
                    },
                    insurance: {
                        type: 'string',
                        description: 'Insurance provider'
                    }
                },
                required: ['text']
            }
        },
        {
            name: 'validate_codes',
            description: 'Validate medical codes against patient chart',
            inputSchema: {
                type: 'object',
                properties: {
                    patient_chart: {
                        type: 'string',
                        description: 'Patient chart text'
                    },
                    human_coded_output: {
                        type: 'string',
                        description: 'Human coded medical codes'
                    },
                    specialty: {
                        type: 'string',
                        enum: ['Cardiology', 'Physical Therapy', 'Internal Medicine', 'Urology', 'Family Medicine', 'Neurology']
                    },
                    taxonomy_code: {
                        type: 'string',
                        description: 'Taxonomy code'
                    },
                    insurance: {
                        type: 'string',
                        description: 'Insurance provider'
                    }
                },
                required: ['patient_chart', 'human_coded_output']
            }
        },
        {
            name: 'calculate_raf',
            description: 'Calculate Risk Adjustment Factor (RAF) score',
            inputSchema: {
                type: 'object',
                properties: {
                    demographics: {
                        type: 'string',
                        description: 'Patient demographics'
                    },
                    illnesses: {
                        type: 'string',
                        description: 'Patient illnesses and conditions'
                    },
                    model: {
                        type: 'string',
                        enum: ['V28', 'V24', 'V22'],
                        default: 'V28'
                    }
                },
                required: ['demographics', 'illnesses']
            }
        },
        {
            name: 'qa_validate_codes',
            description: 'Perform comprehensive QA validation of coded medical input',
            inputSchema: {
                type: 'object',
                properties: {
                    coded_input: {
                        type: 'string',
                        description: 'Coded medical input to validate'
                    }
                },
                required: ['coded_input']
            }
        },
        {
            name: 'parse_eob',
            description: 'Parse and analyze Explanation of Benefits (EOB) documents',
            inputSchema: {
                type: 'object',
                properties: {
                    content: {
                        type: 'string',
                        description: 'EOB document content'
                    }
                },
                required: ['content']
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
 * Handle tools/call request
 */
async function handleToolsCall(ws, id, params, req) {
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
    
    // Extract API key from WebSocket headers or connection metadata
    const apiKey = extractApiKeyFromWebSocket(req);
    
    // For now, allow requests without authentication for testing
    if (!apiKey) {
        console.log('No API key provided, using default');
        req.apiKeyData = { id: 1, user_id: 1, environment: 'prod' };
    } else {
        // Validate API key
        try {
            const apiKeyData = await validateApiKeyData(apiKey);
            req.apiKeyData = apiKeyData;
        } catch (error) {
            console.log('API key validation failed, using default');
            req.apiKeyData = { id: 1, user_id: 1, environment: 'prod' };
        }
    }
    
    const startTime = Date.now();
    
    try {
        let result;
        
        switch (name) {
            case 'process_chart':
                result = await apiServiceRouter.processChart('prod', args, apiKey);
                break;
            case 'validate_codes':
                result = await apiServiceRouter.validateCodes('prod', args, apiKey);
                break;
            case 'calculate_raf':
                result = await apiServiceRouter.calculateRaf('prod', args, apiKey);
                break;
            case 'qa_validate_codes':
                result = await apiServiceRouter.qaValidateCodes('prod', args, apiKey);
                break;
            case 'parse_eob':
                result = await apiServiceRouter.parseEob('prod', args, apiKey);
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
        
        // Log usage
        try {
            await logUsage({
                requestId: ws.requestId,
                apiKeyId: req.apiKeyData.id,
                toolName: name,
                requestData: args,
                responseData: result,
                statusCode: 200,
                processingTimeMs: processingTime,
                errorMessage: null
            });
        } catch (logError) {
            console.error('Error logging usage:', logError);
        }
        
        return {
            jsonrpc: '2.0',
            id,
            result: {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            }
        };
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        // Log error
        try {
            await logUsage({
                requestId: ws.requestId,
                apiKeyId: req.apiKeyData.id,
                toolName: name,
                requestData: args,
                responseData: null,
                statusCode: 500,
                processingTimeMs: processingTime,
                errorMessage: error.message
            });
        } catch (logError) {
            console.error('Error logging usage:', logError);
        }
        
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
 * Extract API key from WebSocket connection
 */
function extractApiKeyFromWebSocket(req) {
    // Try to get API key from query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const apiKey = url.searchParams.get('api_key') || url.searchParams.get('x-api-key');
    
    if (apiKey) {
        return apiKey;
    }
    
    // Try to get from headers
    return req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
}

/**
 * Validate API key data (simplified version of the middleware)
 */
async function validateApiKeyData(apiKey) {
    // Use the existing validation logic from the middleware
    const { validateApiKey } = require('../middleware/auth');
    
    // Create a mock request object
    const mockReq = {
        headers: {
            'x-api-key': apiKey
        }
    };
    
    const mockRes = {
        status: () => ({ json: () => {} })
    };
    
    const mockNext = () => {};
    
    // This is a bit hacky, but we need to extract the validation logic
    // For now, let's create a simplified version
    try {
        const response = await fetch(`${process.env.BACKEND_SERVICE_URL}/api/validate-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apikey: apiKey })
        });
        
        if (!response.ok) {
            throw new Error('Invalid API key');
        }
        
        const data = await response.json();
        
        if (!data.valid) {
            throw new Error('Invalid API key');
        }
        
        return data.keyData;
    } catch (error) {
        throw new Error('API key validation failed');
    }
}

module.exports = {
    createWebSocketHandler
};
