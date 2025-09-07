#!/usr/bin/env node

/**
 * Test script for MCP server without requiring backend service
 * This script tests the MCP server capabilities and tools directly
 */

// Using built-in fetch (Node.js 24.7.0+)

// Configuration
const MCP_SERVER_URL = 'http://localhost:3000';

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
            console.log(`   Version: ${data.version}`);
            console.log(`   Environment: ${data.environment}`);
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
 * Test OpenAI-compatible tools endpoint
 */
async function testOpenAITools() {
    try {
        console.log('🤖 Testing OpenAI-compatible tools...');
        
        const response = await fetch(`${MCP_SERVER_URL}/capabilities/openai-tools`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ OpenAI tools retrieved');
            console.log(`   Available tools: ${data.tools?.length || 0}`);
            if (data.tools) {
                data.tools.forEach(tool => {
                    console.log(`   - ${tool.function.name}: ${tool.function.description}`);
                });
            }
            return true;
        } else {
            console.log('❌ OpenAI tools test failed');
            return false;
        }
    } catch (error) {
        console.log(`❌ OpenAI tools test error: ${error.message}`);
        return false;
    }
}

/**
 * Test MCP tools endpoint (requires API key)
 */
async function testMcpTools() {
    try {
        console.log('🛠️  Testing MCP tools endpoint...');
        
        const response = await fetch(`${MCP_SERVER_URL}/mcp/tools`, {
            headers: {
                'x-api-key': 'test-key'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ MCP tools endpoint accessible');
            console.log(`   Available tools: ${data.tools?.length || 0}`);
            return true;
        } else {
            const errorData = await response.json();
            console.log('⚠️  MCP tools endpoint requires valid API key');
            console.log(`   Error: ${errorData.error}`);
            console.log(`   This is expected if backend service is not running`);
            return false;
        }
    } catch (error) {
        console.log(`❌ MCP tools test error: ${error.message}`);
        return false;
    }
}

/**
 * Main test function
 */
async function runTests() {
    console.log('🚀 MCP Server Testing (Without Backend)');
    console.log('========================================');
    console.log(`MCP Server URL: ${MCP_SERVER_URL}`);
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test health
    totalTests++;
    if (await testHealth()) passedTests++;
    
    // Test capabilities
    totalTests++;
    if (await testCapabilities()) passedTests++;
    
    // Test OpenAI tools
    totalTests++;
    if (await testOpenAITools()) passedTests++;
    
    // Test MCP tools (will fail without backend)
    totalTests++;
    if (await testMcpTools()) passedTests++;
    
    // Summary
    console.log('\n📊 Test Results');
    console.log('================');
    console.log(`Passed: ${passedTests}/${totalTests} tests`);
    
    if (passedTests >= 3) {
        console.log('🎉 MCP server is working correctly!');
        console.log('\n📋 Next Steps:');
        console.log('1. Start the backend service for full functionality');
        console.log('2. Configure your ChatGPT application to use the MCP tools');
        console.log('3. Test with real API keys');
    } else {
        console.log('⚠️  Some tests failed. Please check the MCP server configuration.');
    }
    
    console.log('\n🔧 For ChatGPT Integration:');
    console.log('1. Use the OpenAI-compatible tools from /capabilities/openai-tools');
    console.log('2. Register these tools with your ChatGPT application');
    console.log('3. Handle function calls by routing them to the MCP server');
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = {
    testHealth,
    testCapabilities,
    testOpenAITools,
    testMcpTools,
    runTests
};
