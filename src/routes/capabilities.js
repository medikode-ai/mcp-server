const express = require('express');
const router = express.Router();

/**
 * MCP Capabilities endpoint - returns tool schema for OpenAI-compatible tool definitions
 */
router.get('/', (req, res) => {
    const capabilities = {
        server: {
            name: 'medikode-mcp-server',
            version: '1.0.0',
            description: 'Model Context Protocol server for Medikode healthcare SaaS platform'
        },
        tools: [
            {
                name: 'process_chart',
                description: 'Process patient chart text and return ICD/CPT code suggestions with medical coding analysis',
                inputSchema: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'Patient chart text or medical documentation to analyze'
                        },
                        specialty: {
                            type: 'string',
                            description: 'Medical specialty (optional)',
                            enum: ['Cardiology', 'Physical Therapy', 'Internal Medicine', 'Urology', 'Family Medicine', 'Neurology']
                        },
                        taxonomy_code: {
                            type: 'string',
                            description: 'NUCC taxonomy code for provider specialization (alternative to specialty)'
                        },
                        insurance: {
                            type: 'string',
                            description: 'Insurance provider information (optional)'
                        }
                    },
                    required: ['text'],
                    additionalProperties: false
                }
            },
            {
                name: 'validate_codes',
                description: 'Validate medical codes against patient chart and return validation results with accuracy assessment',
                inputSchema: {
                    type: 'object',
                    properties: {
                        patient_chart: {
                            type: 'string',
                            description: 'Patient chart text or medical documentation'
                        },
                        human_coded_output: {
                            type: 'string',
                            description: 'Human-coded medical codes to validate against the chart'
                        },
                        specialty: {
                            type: 'string',
                            description: 'Medical specialty (optional)',
                            enum: ['Cardiology', 'Physical Therapy', 'Internal Medicine', 'Urology', 'Family Medicine', 'Neurology']
                        },
                        taxonomy_code: {
                            type: 'string',
                            description: 'NUCC taxonomy code for provider specialization (alternative to specialty)'
                        },
                        insurance: {
                            type: 'string',
                            description: 'Insurance provider information (optional)'
                        }
                    },
                    required: ['patient_chart', 'human_coded_output'],
                    additionalProperties: false
                }
            },
            {
                name: 'calculate_raf',
                description: 'Calculate Risk Adjustment Factor (RAF) score based on patient demographics and conditions',
                inputSchema: {
                    type: 'object',
                    properties: {
                        demographics: {
                            type: 'string',
                            description: 'Patient demographic information (age, gender, etc.)'
                        },
                        illnesses: {
                            type: 'string',
                            description: 'Patient conditions, diagnoses, and illnesses'
                        },
                        model: {
                            type: 'string',
                            description: 'RAF calculation model version',
                            default: 'V28',
                            enum: ['V28', 'V24', 'V22']
                        }
                    },
                    required: ['demographics', 'illnesses', 'model'],
                    additionalProperties: false
                }
            },
            {
                name: 'qa_validate_codes',
                description: 'Perform comprehensive QA validation of coded medical input with denial risk assessment and optimization recommendations',
                inputSchema: {
                    type: 'object',
                    properties: {
                        coded_input: {
                            type: 'string',
                            description: 'Coded medical input to validate (CPT/HCPCS codes, modifiers, diagnosis links, etc.)'
                        }
                    },
                    required: ['coded_input'],
                    additionalProperties: false
                }
            },
            {
                name: 'parse_eob',
                description: 'Parse and analyze Explanation of Benefits (EOB) documents to extract key information, errors, and warnings',
                inputSchema: {
                    type: 'object',
                    properties: {
                        content: {
                            type: 'string',
                            description: 'EOB document content to parse and analyze'
                        }
                    },
                    required: ['content'],
                    additionalProperties: false
                }
            }
        ],
        resources: [
            {
                name: 'medikode_specialties',
                description: 'List of supported medical specialties',
                mimeType: 'application/json'
            },
            {
                name: 'medikode_taxonomy_codes',
                description: 'Supported NUCC taxonomy codes for provider specialization',
                mimeType: 'application/json'
            }
        ],
        prompts: [
            {
                name: 'medical_coding_help',
                description: 'Get help with medical coding best practices and guidelines',
                arguments: [
                    {
                        name: 'specialty',
                        description: 'Medical specialty to get coding help for',
                        required: false
                    }
                ]
            }
        ]
    };

    res.json(capabilities);
});

/**
 * OpenAI-compatible tools endpoint
 */
router.get('/openai-tools', (req, res) => {
    const openaiTools = [
        {
            type: 'function',
            function: {
                name: 'process_chart',
                description: 'Process patient chart text and return ICD/CPT code suggestions with medical coding analysis',
                parameters: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'Patient chart text or medical documentation to analyze'
                        },
                        specialty: {
                            type: 'string',
                            description: 'Medical specialty (optional)',
                            enum: ['Cardiology', 'Physical Therapy', 'Internal Medicine', 'Urology', 'Family Medicine', 'Neurology']
                        },
                        taxonomy_code: {
                            type: 'string',
                            description: 'NUCC taxonomy code for provider specialization (alternative to specialty)'
                        },
                        insurance: {
                            type: 'string',
                            description: 'Insurance provider information (optional)'
                        }
                    },
                    required: ['text']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'validate_codes',
                description: 'Validate medical codes against patient chart and return validation results with accuracy assessment',
                parameters: {
                    type: 'object',
                    properties: {
                        patient_chart: {
                            type: 'string',
                            description: 'Patient chart text or medical documentation'
                        },
                        human_coded_output: {
                            type: 'string',
                            description: 'Human-coded medical codes to validate against the chart'
                        },
                        specialty: {
                            type: 'string',
                            description: 'Medical specialty (optional)',
                            enum: ['Cardiology', 'Physical Therapy', 'Internal Medicine', 'Urology', 'Family Medicine', 'Neurology']
                        },
                        taxonomy_code: {
                            type: 'string',
                            description: 'NUCC taxonomy code for provider specialization (alternative to specialty)'
                        },
                        insurance: {
                            type: 'string',
                            description: 'Insurance provider information (optional)'
                        }
                    },
                    required: ['patient_chart', 'human_coded_output']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'calculate_raf',
                description: 'Calculate Risk Adjustment Factor (RAF) score based on patient demographics and conditions',
                parameters: {
                    type: 'object',
                    properties: {
                        demographics: {
                            type: 'string',
                            description: 'Patient demographic information (age, gender, etc.)'
                        },
                        illnesses: {
                            type: 'string',
                            description: 'Patient conditions, diagnoses, and illnesses'
                        },
                        model: {
                            type: 'string',
                            description: 'RAF calculation model version',
                            default: 'V28',
                            enum: ['V28', 'V24', 'V22']
                        }
                    },
                    required: ['demographics', 'illnesses', 'model']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'qa_validate_codes',
                description: 'Perform comprehensive QA validation of coded medical input with denial risk assessment and optimization recommendations',
                parameters: {
                    type: 'object',
                    properties: {
                        coded_input: {
                            type: 'string',
                            description: 'Coded medical input to validate (CPT/HCPCS codes, modifiers, diagnosis links, etc.)'
                        }
                    },
                    required: ['coded_input']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'parse_eob',
                description: 'Parse and analyze Explanation of Benefits (EOB) documents to extract key information, errors, and warnings',
                parameters: {
                    type: 'object',
                    properties: {
                        content: {
                            type: 'string',
                            description: 'EOB document content to parse and analyze'
                        }
                    },
                    required: ['content']
                }
            }
        }
    ];

    res.json({
        tools: openaiTools,
        server: {
            name: 'medikode-mcp-server',
            version: '1.0.0',
            description: 'Model Context Protocol server for Medikode healthcare SaaS platform'
        }
    });
});

module.exports = router;
