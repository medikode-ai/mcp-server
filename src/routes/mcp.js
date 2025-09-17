const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { logUsage } = require('../database/usageLogger');
const { getVersion } = require('../utils/version');
const apiServiceRouter = require('../services/apiServiceRouter');

// Validation schemas
const processChartSchema = Joi.object({
    text: Joi.string().required().min(1).max(100000),
    specialty: Joi.string().valid('Cardiology', 'Physical Therapy', 'Internal Medicine', 'Urology', 'Family Medicine', 'Neurology').optional(),
    taxonomy_code: Joi.string().optional(),
    insurance: Joi.string().optional()
}).custom((value, helpers) => {
    if (value.specialty && value.taxonomy_code) {
        return helpers.error('custom.specialtyAndTaxonomy');
    }
    return value;
}).messages({
    'custom.specialtyAndTaxonomy': 'Cannot provide both specialty and taxonomy_code. Please provide only one.'
});

const validateCodesSchema = Joi.object({
    patient_chart: Joi.string().required().min(1).max(100000),
    human_coded_output: Joi.string().required().min(1).max(100000),
    specialty: Joi.string().valid('Cardiology', 'Physical Therapy', 'Internal Medicine', 'Urology', 'Family Medicine', 'Neurology').optional(),
    taxonomy_code: Joi.string().optional(),
    insurance: Joi.string().optional()
}).custom((value, helpers) => {
    if (value.specialty && value.taxonomy_code) {
        return helpers.error('custom.specialtyAndTaxonomy');
    }
    return value;
}).messages({
    'custom.specialtyAndTaxonomy': 'Cannot provide both specialty and taxonomy_code. Please provide only one.'
});

const calculateRafSchema = Joi.object({
    demographics: Joi.string().required().min(1).max(100000),
    illnesses: Joi.string().required().min(1).max(100000),
    model: Joi.string().valid('V28', 'V24', 'V22').default('V28')
});

const qaValidateCodesSchema = Joi.object({
    coded_input: Joi.string().required().min(1).max(100000)
});

const parseEobSchema = Joi.object({
    content: Joi.string().required().min(1).max(100000)
});

/**
 * Helper function to make API calls to the api-service based on environment
 */
async function callApiService(endpoint, data, apiKey, environment) {
    try {
        let responseData;
        
        switch (endpoint) {
            case '/assistant':
                responseData = await apiServiceRouter.processChart(environment, data, apiKey);
                break;
            case '/validator':
                responseData = await apiServiceRouter.validateCodes(environment, data, apiKey);
                break;
            case '/rafscore':
                responseData = await apiServiceRouter.calculateRaf(environment, data, apiKey);
                break;
            case '/qavalidator':
                responseData = await apiServiceRouter.qaValidateCodes(environment, data, apiKey);
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

/**
 * Helper function to log MCP tool usage
 */
async function logMCPUsage(req, toolName, requestData, responseData, statusCode, processingTimeMs, errorMessage = null) {
    try {
        await logUsage({
            requestId: req.requestId,
            apiKeyId: req.apiKeyData.id,
            toolName: toolName,
            requestData: requestData,
            responseData: responseData,
            statusCode: statusCode,
            processingTimeMs: processingTimeMs,
            errorMessage: errorMessage,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip
        });
    } catch (error) {
        console.error('Failed to log MCP usage:', error);
    }
}

/**
 * MCP Tool: process_chart
 * Forwards to /assistant endpoint in api-service
 */
router.post('/tools/process_chart', async (req, res) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    req.requestId = requestId;

    try {
        // Validate request data
        const { error, value } = processChartSchema.validate(req.body);
        if (error) {
            const processingTime = Date.now() - startTime;
            await logMCPUsage(req, 'process_chart', req.body, null, 400, processingTime, error.details[0].message);
            
            return res.status(400).json({
                error: 'Validation error',
                details: error.details[0].message,
                timestamp: new Date().toISOString(),
                service: 'medikode-mcp-server',
                tool: 'process_chart',
                request_id: requestId
            });
        }

        // Get environment from API key data
        const environment = req.apiKeyData?.environment || 'sandbox';
        
        // Call api-service
        const apiResponse = await callApiService('/assistant', value, req.headers['x-api-key'], environment);
        
        const processingTime = Date.now() - startTime;
        
        // Log usage
        await logMCPUsage(req, 'process_chart', value, apiResponse.data, apiResponse.status, processingTime);
        
        // Return response
        res.status(apiResponse.status).json({
            ...apiResponse.data,
            mcp_metadata: {
                tool: 'process_chart',
                request_id: requestId,
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`[${requestId}] process_chart error:`, error);
        
        await logMCPUsage(req, 'process_chart', req.body, null, 500, processingTime, error.message);
        
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString(),
            service: 'medikode-mcp-server',
            tool: 'process_chart',
            request_id: requestId
        });
    }
});

/**
 * MCP Tool: validate_codes
 * Forwards to /validator endpoint in api-service
 */
router.post('/tools/validate_codes', async (req, res) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    req.requestId = requestId;

    try {
        // Validate request data
        const { error, value } = validateCodesSchema.validate(req.body);
        if (error) {
            const processingTime = Date.now() - startTime;
            await logMCPUsage(req, 'validate_codes', req.body, null, 400, processingTime, error.details[0].message);
            
            return res.status(400).json({
                error: 'Validation error',
                details: error.details[0].message,
                timestamp: new Date().toISOString(),
                service: 'medikode-mcp-server',
                tool: 'validate_codes',
                request_id: requestId
            });
        }

        // Get environment from API key data
        const environment = req.apiKeyData?.environment || 'sandbox';
        
        // Call api-service
        const apiResponse = await callApiService('/validator', value, req.headers['x-api-key'], environment);
        
        const processingTime = Date.now() - startTime;
        
        // Log usage
        await logMCPUsage(req, 'validate_codes', value, apiResponse.data, apiResponse.status, processingTime);
        
        // Return response
        res.status(apiResponse.status).json({
            ...apiResponse.data,
            mcp_metadata: {
                tool: 'validate_codes',
                request_id: requestId,
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`[${requestId}] validate_codes error:`, error);
        
        await logMCPUsage(req, 'validate_codes', req.body, null, 500, processingTime, error.message);
        
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString(),
            service: 'medikode-mcp-server',
            tool: 'validate_codes',
            request_id: requestId
        });
    }
});

/**
 * MCP Tool: calculate_raf
 * Forwards to /rafscore endpoint in api-service
 */
router.post('/tools/calculate_raf', async (req, res) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    req.requestId = requestId;

    try {
        // Validate request data
        const { error, value } = calculateRafSchema.validate(req.body);
        if (error) {
            const processingTime = Date.now() - startTime;
            await logMCPUsage(req, 'calculate_raf', req.body, null, 400, processingTime, error.details[0].message);
            
            return res.status(400).json({
                error: 'Validation error',
                details: error.details[0].message,
                timestamp: new Date().toISOString(),
                service: 'medikode-mcp-server',
                tool: 'calculate_raf',
                request_id: requestId
            });
        }

        // Get environment from API key data
        const environment = req.apiKeyData?.environment || 'sandbox';
        
        // Call api-service
        const apiResponse = await callApiService('/rafscore', value, req.headers['x-api-key'], environment);
        
        const processingTime = Date.now() - startTime;
        
        // Log usage
        await logMCPUsage(req, 'calculate_raf', value, apiResponse.data, apiResponse.status, processingTime);
        
        // Return response
        res.status(apiResponse.status).json({
            ...apiResponse.data,
            mcp_metadata: {
                tool: 'calculate_raf',
                request_id: requestId,
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`[${requestId}] calculate_raf error:`, error);
        
        await logMCPUsage(req, 'calculate_raf', req.body, null, 500, processingTime, error.message);
        
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString(),
            service: 'medikode-mcp-server',
            tool: 'calculate_raf',
            request_id: requestId
        });
    }
});

/**
 * MCP Tool: qa_validate_codes
 * Forwards to /qavalidator endpoint in api-service
 */
router.post('/tools/qa_validate_codes', async (req, res) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    req.requestId = requestId;

    try {
        // Validate request data
        const { error, value } = qaValidateCodesSchema.validate(req.body);
        if (error) {
            const processingTime = Date.now() - startTime;
            await logMCPUsage(req, 'qa_validate_codes', req.body, null, 400, processingTime, error.details[0].message);
            
            return res.status(400).json({
                error: 'Validation error',
                details: error.details[0].message,
                timestamp: new Date().toISOString(),
                service: 'medikode-mcp-server',
                tool: 'qa_validate_codes',
                request_id: requestId
            });
        }

        // Get environment from API key data
        const environment = req.apiKeyData?.environment || 'sandbox';
        
        // Call api-service
        const apiResponse = await callApiService('/qavalidator', value, req.headers['x-api-key'], environment);
        
        const processingTime = Date.now() - startTime;
        
        // Log usage
        await logMCPUsage(req, 'qa_validate_codes', value, apiResponse.data, apiResponse.status, processingTime);
        
        // Return response
        res.status(apiResponse.status).json({
            ...apiResponse.data,
            mcp_metadata: {
                tool: 'qa_validate_codes',
                request_id: requestId,
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`[${requestId}] qa_validate_codes error:`, error);
        
        await logMCPUsage(req, 'qa_validate_codes', req.body, null, 500, processingTime, error.message);
        
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString(),
            service: 'medikode-mcp-server',
            tool: 'qa_validate_codes',
            request_id: requestId
        });
    }
});

/**
 * MCP Tool: parse_eob
 * Forwards to /eobparser endpoint in api-service
 */
router.post('/tools/parse_eob', async (req, res) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    req.requestId = requestId;

    try {
        // Validate request data
        const { error, value } = parseEobSchema.validate(req.body);
        if (error) {
            const processingTime = Date.now() - startTime;
            await logMCPUsage(req, 'parse_eob', req.body, null, 400, processingTime, error.details[0].message);
            
            return res.status(400).json({
                error: 'Validation error',
                details: error.details[0].message,
                timestamp: new Date().toISOString(),
                service: 'medikode-mcp-server',
                tool: 'parse_eob',
                request_id: requestId
            });
        }

        // Get environment from API key data
        const environment = req.apiKeyData?.environment || 'sandbox';
        
        // Call api-service
        const apiResponse = await callApiService('/eobparser', value, req.headers['x-api-key'], environment);
        
        const processingTime = Date.now() - startTime;
        
        // Log usage
        await logMCPUsage(req, 'parse_eob', value, apiResponse.data, processingTime);
        
        // Return response
        res.status(apiResponse.status).json({
            ...apiResponse.data,
            mcp_metadata: {
                tool: 'parse_eob',
                request_id: requestId,
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`[${requestId}] parse_eob error:`, error);
        
        await logMCPUsage(req, 'parse_eob', req.body, null, 500, processingTime, error.message);
        
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString(),
            service: 'medikode-mcp-server',
            tool: 'parse_eob',
            request_id: requestId
        });
    }
});

/**
 * Root MCP endpoint - required for Cursor MCP integration
 */
router.get('/', (req, res) => {
    res.json({
        protocol: 'mcp',
        version: '1.0.0',
        capabilities: {
            tools: true,
            resources: false,
            prompts: false
        },
        serverInfo: {
            name: 'medikode-mcp-server',
            version: getVersion()
        },
        tools: [
            {
                name: 'process_chart',
                description: 'Process patient chart text and return ICD/CPT code suggestions',
                inputSchema: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'Patient chart text' },
                        specialty: { type: 'string', enum: ['Cardiology', 'Physical Therapy', 'Internal Medicine', 'Urology', 'Family Medicine', 'Neurology'] },
                        taxonomy_code: { type: 'string', description: 'Taxonomy code' },
                        insurance: { type: 'string', description: 'Insurance provider' }
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
                        patient_chart: { type: 'string', description: 'Patient chart text' },
                        human_coded_output: { type: 'string', description: 'Human coded medical codes' },
                        specialty: { type: 'string', enum: ['Cardiology', 'Physical Therapy', 'Internal Medicine', 'Urology', 'Family Medicine', 'Neurology'] },
                        taxonomy_code: { type: 'string', description: 'Taxonomy code' },
                        insurance: { type: 'string', description: 'Insurance provider' }
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
                        demographics: { type: 'string', description: 'Patient demographics' },
                        illnesses: { type: 'string', description: 'Patient illnesses and conditions' },
                        model: { type: 'string', enum: ['V28', 'V24', 'V22'], default: 'V28' }
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
                        coded_input: { type: 'string', description: 'Coded medical input to validate' }
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
                        content: { type: 'string', description: 'EOB document content' }
                    },
                    required: ['content']
                }
            }
        ],
        timestamp: new Date().toISOString(),
        service: 'medikode-mcp-server'
    });
});

/**
 * List available MCP tools
 */
router.get('/tools', (req, res) => {
    res.json({
        tools: [
            {
                name: 'process_chart',
                description: 'Process patient chart text and return ICD/CPT code suggestions',
                endpoint: '/mcp/tools/process_chart',
                method: 'POST'
            },
            {
                name: 'validate_codes',
                description: 'Validate medical codes against patient chart',
                endpoint: '/mcp/tools/validate_codes',
                method: 'POST'
            },
            {
                name: 'calculate_raf',
                description: 'Calculate Risk Adjustment Factor (RAF) score',
                endpoint: '/mcp/tools/calculate_raf',
                method: 'POST'
            },
            {
                name: 'qa_validate_codes',
                description: 'Perform comprehensive QA validation of coded medical input',
                endpoint: '/mcp/tools/qa_validate_codes',
                method: 'POST'
            },
            {
                name: 'parse_eob',
                description: 'Parse and analyze Explanation of Benefits (EOB) documents',
                endpoint: '/mcp/tools/parse_eob',
                method: 'POST'
            }
        ],
        timestamp: new Date().toISOString(),
        service: 'medikode-mcp-server'
    });
});

module.exports = router;
