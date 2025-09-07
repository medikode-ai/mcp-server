const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8004/mcp?x-api-key=mk_e434859e2f6b8684ffed0751d6c0ea3d866513327662c9d011e55af59d0f84ff');

let messageId = 1;

ws.on('open', function open() {
    console.log('WebSocket connection opened');
    
    // Send initialize message
    const initMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
                name: 'test-client',
                version: '1.0.0'
            }
        }
    };
    
    console.log('Sending initialize message:', JSON.stringify(initMessage, null, 2));
    ws.send(JSON.stringify(initMessage));
});

ws.on('message', function message(data) {
    const response = JSON.parse(data.toString());
    console.log('Received message:', JSON.stringify(response, null, 2));
    
    // After initialize, test tools/list
    if (response.id === 1 && response.result) {
        console.log('\n--- Testing tools/list ---');
        const toolsListMessage = {
            jsonrpc: '2.0',
            id: messageId++,
            method: 'tools/list'
        };
        console.log('Sending tools/list message:', JSON.stringify(toolsListMessage, null, 2));
        ws.send(JSON.stringify(toolsListMessage));
    }
    
    // After tools/list, test a tool call
    if (response.id === 2 && response.result && response.result.tools) {
        console.log('\n--- Testing tools/call with process_chart ---');
        const toolCallMessage = {
            jsonrpc: '2.0',
            id: messageId++,
            method: 'tools/call',
            params: {
                name: 'process_chart',
                arguments: {
                    text: 'Patient presents with chest pain and shortness of breath. EKG shows ST elevation. Troponin levels elevated.',
                    specialty: 'Cardiology',
                    taxonomy_code: '207RC0000X',
                    insurance: 'Medicare'
                }
            }
        };
        console.log('Sending tools/call message:', JSON.stringify(toolCallMessage, null, 2));
        ws.send(JSON.stringify(toolCallMessage));
    }
    
    // After tool call, test ping
    if (response.id === 3) {
        console.log('\n--- Testing ping ---');
        const pingMessage = {
            jsonrpc: '2.0',
            id: messageId++,
            method: 'ping'
        };
        console.log('Sending ping message:', JSON.stringify(pingMessage, null, 2));
        ws.send(JSON.stringify(pingMessage));
    }
    
    // After ping, close connection
    if (response.id === 4) {
        console.log('\n--- Test completed, closing connection ---');
        setTimeout(() => {
            ws.close();
        }, 1000);
    }
});

ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
});

ws.on('close', function close() {
    console.log('WebSocket connection closed');
});

// Keep the connection alive for testing
setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
        console.log('Timeout reached, closing connection');
        ws.close();
    }
}, 30000);
