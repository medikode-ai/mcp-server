const WebSocket = require('ws');

const API_KEY = process.env.MEDIKODE_API_KEY || 'your-api-key-here';
const ws = new WebSocket(`ws://localhost:8004/mcp?x-api-key=${API_KEY}`);

ws.on('open', function open() {
    console.log('WebSocket connection opened');
    
    // Send initialize message
    const initMessage = {
        jsonrpc: '2.0',
        id: 1,
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
    console.log('Received message:', data.toString());
});

ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
});

ws.on('close', function close() {
    console.log('WebSocket connection closed');
});

// Keep the connection alive for a few seconds
setTimeout(() => {
    ws.close();
}, 5000);
