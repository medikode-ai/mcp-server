#!/usr/bin/env node

/**
 * Test script for MCP Inspector HTTP endpoint
 */

const http = require('http');

const MCP_SERVER_URL = 'http://localhost:3000';
const MCP_INSPECTOR_ENDPOINT = '/mcp/inspect';

/**
 * Make HTTP request to MCP Inspector endpoint
 */
function makeMCPRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: method,
            params: params
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: MCP_INSPECTOR_ENDPOINT,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Test MCP Inspector functionality
 */
async function testMCPInspector() {
    console.log('🧪 Testing MCP Inspector HTTP endpoint...\n');

    try {
        // Test 1: Initialize
        console.log('1. Testing initialize...');
        const initResponse = await makeMCPRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
                name: 'test-client',
                version: '1.0.0'
            }
        });
        console.log('✅ Initialize response:', JSON.stringify(initResponse, null, 2));
        console.log('');

        // Test 2: List tools
        console.log('2. Testing tools/list...');
        const toolsResponse = await makeMCPRequest('tools/list');
        console.log('✅ Tools list response:', JSON.stringify(toolsResponse, null, 2));
        console.log('');

        // Test 3: Ping
        console.log('3. Testing ping...');
        const pingResponse = await makeMCPRequest('ping');
        console.log('✅ Ping response:', JSON.stringify(pingResponse, null, 2));
        console.log('');

        console.log('🎉 All MCP Inspector tests passed!');
        console.log('');
        console.log('📋 MCP Inspector Configuration:');
        console.log(`   Transport Type: Streamable HTTP`);
        console.log(`   URL: ${MCP_SERVER_URL}${MCP_INSPECTOR_ENDPOINT}`);
        console.log(`   Authentication: Optional (x-api-key header)`);
        console.log('');
        console.log('🔗 To connect with MCP Inspector:');
        console.log('   1. Run: npx @modelcontextprotocol/inspector');
        console.log('   2. Select "Streamable HTTP" transport');
        console.log(`   3. Enter URL: ${MCP_SERVER_URL}${MCP_INSPECTOR_ENDPOINT}`);
        console.log('   4. Click Connect');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('');
        console.log('💡 Make sure the MCP server is running:');
        console.log('   cd mcp-server && npm start');
        process.exit(1);
    }
}

// Run tests
testMCPInspector();
