#!/usr/bin/env node

const { spawn } = require('child_process');
const { validateApiKeyData } = require('./src/websocket/mcpWebSocket');
const apiServiceRouter = require('./src/services/apiServiceRouter');
const { logUsage } = require('./src/database/usageLogger');

// MCP Server implementation using stdio transport
class MCPServer {
    constructor() {
        this.requestId = 0;
        this.apiKey = process.env.MCP_API_KEY || 'mk_e434859e2f6b8684ffed0751d6c0ea3d866513327662c9d011e55af59d0f84ff';
    }

    async start() {
        console.error('MCP Server starting...');
        
        // Set up stdio handling
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', this.handleMessage.bind(this));
        process.stdin.on('end', () => {
            console.error('MCP Server stdin ended');
            process.exit(0);
        });

        process.on('SIGINT', () => {
            console.error('MCP Server received SIGINT');
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.error('MCP Server received SIGTERM');
            process.exit(0);
        });

        console.error('MCP Server ready');
    }

    async handleMessage(data) {
        try {
            const lines = data.trim().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    const message = JSON.parse(line);
                    const response = await this.processMessage(message);
                    if (response) {
                        console.log(JSON.stringify(response));
                    }
                }
            }
        } catch (error) {
            console.error('Error handling message:', error);
            this.sendError(null, -32600, 'Invalid Request', error.message);
        }
    }

    async processMessage(message) {
        const { jsonrpc, id, method, params } = message;

        if (jsonrpc !== '2.0') {
            return this.sendError(id, -32600, 'Invalid Request');
        }

        try {
            switch (method) {
                case 'initialize':
                    return this.handleInitialize(id, params);
                case 'tools/list':
                    return this.handleToolsList(id);
                case 'tools/call':
                    return await this.handleToolsCall(id, params);
                case 'ping':
                    return { jsonrpc: '2.0', id, result: {} };
                default:
                    return this.sendError(id, -32601, 'Method not found');
            }
        } catch (error) {
            console.error('Error processing message:', error);
            return this.sendError(id, -32603, 'Internal error', error.message);
        }
    }

    handleInitialize(id, params) {
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

    handleToolsList(id) {
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

    async handleToolsCall(id, params) {
        const { name, arguments: args } = params;

        if (!name || !args) {
            return this.sendError(id, -32602, 'Invalid params');
        }

        const startTime = Date.now();
        const requestId = `stdio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            let result;

            switch (name) {
                case 'process_chart':
                    result = await apiServiceRouter.processChart('prod', args, this.apiKey);
                    break;
                case 'validate_codes':
                    result = await apiServiceRouter.validateCodes('prod', args, this.apiKey);
                    break;
                case 'calculate_raf':
                    result = await apiServiceRouter.calculateRaf('prod', args, this.apiKey);
                    break;
                case 'qa_validate_codes':
                    result = await apiServiceRouter.qaValidateCodes('prod', args, this.apiKey);
                    break;
                case 'parse_eob':
                    result = await apiServiceRouter.parseEob('prod', args, this.apiKey);
                    break;
                default:
                    return this.sendError(id, -32601, 'Unknown tool');
            }

            const processingTime = Date.now() - startTime;

            // Log usage
            try {
                await logUsage({
                    requestId: requestId,
                    apiKeyId: 1, // Default for stdio mode
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
                    requestId: requestId,
                    apiKeyId: 1,
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

            return this.sendError(id, -32603, 'Internal error', error.message);
        }
    }

    sendError(id, code, message, data = null) {
        const error = { code, message };
        if (data) {
            error.data = data;
        }
        return {
            jsonrpc: '2.0',
            id,
            error
        };
    }
}

// Start the server
const server = new MCPServer();
server.start().catch(error => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
});
