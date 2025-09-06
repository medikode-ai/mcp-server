const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { logUsage } = require('../database/usageLogger');

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
 * Helper function to make API calls to the api-service
 */
async function callApiService(endpoint, data, apiKey) {
    const apiServiceUrl = process.env.API_SERVICE_URL || 'http://localhost:3001';
    const url = `${apiServiceUrl}${endpoint}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        body: JSON.stringify(data)
    });

    const responseData = await response.json();
    
    return {
        status: response.status,
        data: responseData
    };
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

        // Call api-service
        const apiResponse = await callApiService('/assistant', value, req.headers['x-api-key']);
        
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

        // Call api-service
        const apiResponse = await callApiService('/validator', value, req.headers['x-api-key']);
        
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

        // Call api-service
        const apiResponse = await callApiService('/rafscore', value, req.headers['x-api-key']);
        
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

        // Call api-service
        const apiResponse = await callApiService('/qavalidator', value, req.headers['x-api-key']);
        
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

        // Call api-service
        const apiResponse = await callApiService('/eobparser', value, req.headers['x-api-key']);
        
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
