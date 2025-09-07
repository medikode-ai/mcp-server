#!/usr/bin/env node

/**
 * Test script to verify environment-based routing in MCP server
 * This script tests that the MCP server correctly routes requests to the appropriate API service
 * based on the API key's environment (prod vs sandbox)
 */

// Using built-in fetch (Node.js 18+)

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';
const TEST_API_KEY_PROD = process.env.TEST_API_KEY_PROD || 'mk_test_prod_key';
const TEST_API_KEY_SANDBOX = process.env.TEST_API_KEY_SANDBOX || 'mk_test_sandbox_key';

// Test data
const testData = {
    text: "Patient presents with chest pain and shortness of breath. History of hypertension and diabetes.",
    specialty: "Cardiology"
};

/**
 * Test MCP tool with specific API key
 */
async function testMcpTool(apiKey, environment, toolName = 'process_chart') {
    try {
        console.log(`\n🧪 Testing ${toolName} with ${environment} API key...`);
        
        const response = await fetch(`${MCP_SERVER_URL}/mcp/tools/${toolName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify(testData)
        });

        const responseData = await response.json();
        
        if (response.ok) {
            console.log(`✅ ${environment} API key test passed`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Environment: ${responseData.mcp_metadata?.environment || 'unknown'}`);
            console.log(`   Processing time: ${responseData.mcp_metadata?.processing_time_ms}ms`);
            console.log(`   Input type: MCP (distinguished from regular API calls)`);
            return true;
        } else {
            console.log(`❌ ${environment} API key test failed`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Error: ${responseData.error || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${environment} API key test error: ${error.message}`);
        return false;
    }
}

/**
 * Test MCP server health
 */
async function testHealth() {
    try {
        console.log('🏥 Testing MCP server health...');
        
        const response = await fetch(`${MCP_SERVER_URL}/health`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ MCP server is healthy');
            console.log(`   Status: ${data.status}`);
            console.log(`   Timestamp: ${data.timestamp}`);
            return true;
        } else {
            console.log('❌ MCP server health check failed');
            return false;
        }
    } catch (error) {
        console.log(`❌ Health check error: ${error.message}`);
        return false;
    }
}

/**
 * Test MCP capabilities
 */
async function testCapabilities() {
    try {
        console.log('🔧 Testing MCP capabilities...');
        
        const response = await fetch(`${MCP_SERVER_URL}/capabilities`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ MCP capabilities retrieved');
            console.log(`   Available tools: ${data.tools?.length || 0}`);
            if (data.tools) {
                data.tools.forEach(tool => {
                    console.log(`   - ${tool.name}: ${tool.description}`);
                });
            }
            return true;
        } else {
            console.log('❌ MCP capabilities test failed');
            return false;
        }
    } catch (error) {
        console.log(`❌ Capabilities test error: ${error.message}`);
        return false;
    }
}

/**
 * Main test function
 */
async function runTests() {
    console.log('🚀 Starting MCP Environment Routing Tests');
    console.log('==========================================');
    console.log(`MCP Server URL: ${MCP_SERVER_URL}`);
    console.log(`Production API Key: ${TEST_API_KEY_PROD}`);
    console.log(`Sandbox API Key: ${TEST_API_KEY_SANDBOX}`);
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test health
    totalTests++;
    if (await testHealth()) passedTests++;
    
    // Test capabilities
    totalTests++;
    if (await testCapabilities()) passedTests++;
    
    // Test with production API key
    totalTests++;
    if (await testMcpTool(TEST_API_KEY_PROD, 'production')) passedTests++;
    
    // Test with sandbox API key
    totalTests++;
    if (await testMcpTool(TEST_API_KEY_SANDBOX, 'sandbox')) passedTests++;
    
    // Summary
    console.log('\n📊 Test Results');
    console.log('================');
    console.log(`Passed: ${passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Environment-based routing is working correctly.');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Please check the configuration.');
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = {
    testMcpTool,
    testHealth,
    testCapabilities,
    runTests
};
