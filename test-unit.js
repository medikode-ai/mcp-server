#!/usr/bin/env node

/**
 * Simple unit tests that don't require a running server
 * These tests verify that the code can be loaded and basic functionality works
 */

console.log('🧪 Running Unit Tests');
console.log('====================');

let passedTests = 0;
let totalTests = 0;

function test(name, testFn) {
    totalTests++;
    try {
        testFn();
        console.log(`✅ ${name}`);
        passedTests++;
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
    }
}

// Test 1: Can load the main modules
test('Can load mcp-server-stdio.js', () => {
    require('./mcp-server-stdio.js');
});

test('Can load index.js', () => {
    require('./index.js');
});

// Test 2: Can load source modules
test('Can load auth middleware', () => {
    require('./src/middleware/auth.js');
});

test('Can load API service router', () => {
    require('./src/services/apiServiceRouter.js');
});

test('Can load usage logger', () => {
    require('./src/database/usageLogger.js');
});

// Test 3: Can load route modules
test('Can load MCP routes', () => {
    require('./src/routes/mcp.js');
});

test('Can load capabilities routes', () => {
    require('./src/routes/capabilities.js');
});

test('Can load health routes', () => {
    require('./src/routes/health.js');
});

// Test 4: Package.json validation
test('Package.json has required fields', () => {
    const pkg = require('./package.json');
    if (!pkg.name) throw new Error('Missing name field');
    if (!pkg.version) throw new Error('Missing version field');
    if (!pkg.main) throw new Error('Missing main field');
    if (!pkg.bin) throw new Error('Missing bin field');
});

// Test 5: Environment variables
test('Environment variables can be accessed', () => {
    process.env.MEDIKODE_API_KEY = 'test-key';
    if (!process.env.MEDIKODE_API_KEY) throw new Error('Cannot set environment variables');
});

console.log('\n📊 Test Results');
console.log('================');
console.log(`Passed: ${passedTests}/${totalTests} tests`);

if (passedTests === totalTests) {
    console.log('🎉 All unit tests passed!');
    process.exit(0);
} else {
    console.log('⚠️  Some unit tests failed.');
    process.exit(1);
}
