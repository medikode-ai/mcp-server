# Testing MCP Server with ChatGPT on localhost:8004

This guide provides comprehensive instructions for testing the Medikode MCP Server with ChatGPT running on localhost:8004.

## Overview

The Medikode MCP Server provides healthcare-specific tools that can be integrated with ChatGPT using OpenAI's function calling feature. The server runs on port 3000 and exposes 5 main tools:

1. **process_chart** - Analyze patient charts and suggest medical codes
2. **validate_codes** - Validate medical codes against patient documentation
3. **calculate_raf** - Calculate Risk Adjustment Factor scores
4. **qa_validate_codes** - QA validation with denial risk assessment
5. **parse_eob** - Parse Explanation of Benefits documents

## Prerequisites

- Node.js 24+ installed
- Python 3.7+ (for testing scripts)
- OpenAI API key
- Valid Medikode API key
- MCP Server running on localhost:3000
- ChatGPT application running on localhost:8004

## Quick Start

### 1. Start the MCP Server

```bash
cd /Users/muthuka/root/medikode.ai/allnew/mcp-server
node index.js
```

The server should start and display:
```
Medikode MCP Server running on port 3000
Environment: production
API Service URL: http://localhost:3001
```

### 2. Verify Server Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "medikode-mcp-server",
  "version": "1.0.0",
  "timestamp": "2025-09-07T03:30:47.299Z",
  "uptime": 4.872203958,
  "memory": {...},
  "environment": "production"
}
```

### 3. Get OpenAI-Compatible Tool Definitions

```bash
curl http://localhost:3000/capabilities/openai-tools
```

This returns the tool schemas that ChatGPT can use for function calling.

## Integration Methods

### Method 1: Direct API Integration

If your ChatGPT application on localhost:8004 can make HTTP requests, you can integrate directly:

```python
import requests

# Get tool definitions
tools_response = requests.get('http://localhost:3000/capabilities/openai-tools')
tools = tools_response.json()['tools']

# Use with your ChatGPT application
# (Implementation depends on your ChatGPT setup)
```

### Method 2: OpenAI Function Calling

For OpenAI-based ChatGPT applications:

```python
import openai
import requests

# Get MCP tools
tools_response = requests.get('http://localhost:3000/capabilities/openai-tools')
tools = tools_response.json()['tools']

# Use with OpenAI
client = openai.OpenAI(api_key="your-api-key")

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {
            "role": "user",
            "content": "Process this patient chart: 'Patient presents with chest pain and shortness of breath. EKG shows ST elevation. Troponin levels elevated.'"
        }
    ],
    tools=tools,
    tool_choice="auto"
)
```

### Method 3: Custom ChatGPT Integration

If you have a custom ChatGPT application, you can:

1. **Fetch tool definitions** from the MCP server
2. **Register the tools** with your ChatGPT instance
3. **Handle function calls** by routing them to the MCP server

## Testing Scripts

### Automated Testing

Run the provided test script:

```bash
cd /Users/muthuka/root/medikode.ai/allnew/mcp-server
python3 test-chatgpt-integration.py
```

This script will:
- Test MCP server health
- Test all MCP tools directly
- Test ChatGPT integration (if API keys are configured)

### Manual Testing

#### Test 1: Process Chart

```bash
curl -X POST http://localhost:3000/mcp/tools/process_chart \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_MEDIKODE_API_KEY" \
  -d '{
    "text": "65-year-old male presents with chest pain radiating to left arm. EKG shows ST elevation in leads II, III, aVF. Troponin I elevated at 15.2 ng/mL.",
    "specialty": "Cardiology"
  }'
```

#### Test 2: Validate Codes

```bash
curl -X POST http://localhost:3000/mcp/tools/validate_codes \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_MEDIKODE_API_KEY" \
  -d '{
    "patient_chart": "65-year-old male presents with chest pain radiating to left arm. EKG shows ST elevation in leads II, III, aVF. Troponin I elevated at 15.2 ng/mL.",
    "human_coded_output": "I21.9, I25.10, Z95.1",
    "specialty": "Cardiology"
  }'
```

#### Test 3: Calculate RAF

```bash
curl -X POST http://localhost:3000/mcp/tools/calculate_raf \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_MEDIKODE_API_KEY" \
  -d '{
    "demographics": "65-year-old male, Medicare beneficiary",
    "illnesses": "Acute myocardial infarction, Coronary artery disease, Diabetes mellitus type 2",
    "model": "V28"
  }'
```

#### Test 4: QA Validate Codes

```bash
curl -X POST http://localhost:3000/mcp/tools/qa_validate_codes \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_MEDIKODE_API_KEY" \
  -d '{
    "coded_input": "I21.9, I25.10, Z95.1, 99213"
  }'
```

#### Test 5: Parse EOB

```bash
curl -X POST http://localhost:3000/mcp/tools/parse_eob \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_MEDIKODE_API_KEY" \
  -d '{
    "content": "EOB document content with payment details, denials, and adjustments..."
  }'
```

## ChatGPT Application Integration

### For Custom ChatGPT Applications

If you have a custom ChatGPT application running on localhost:8004, here's how to integrate:

#### 1. Add MCP Tool Discovery

```python
import requests

def get_mcp_tools():
    """Fetch MCP tools from the server"""
    try:
        response = requests.get('http://localhost:3000/capabilities/openai-tools')
        response.raise_for_status()
        return response.json()['tools']
    except requests.RequestException as e:
        print(f"Error fetching MCP tools: {e}")
        return []

# Register tools with your ChatGPT instance
mcp_tools = get_mcp_tools()
# Add these tools to your ChatGPT function calling setup
```

#### 2. Handle Function Calls

```python
def handle_mcp_function_call(tool_name, arguments, api_key):
    """Route function calls to MCP server"""
    try:
        response = requests.post(
            f'http://localhost:3000/mcp/tools/{tool_name}',
            headers={
                'Content-Type': 'application/json',
                'x-api-key': api_key
            },
            json=arguments
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}

# In your ChatGPT message handler:
if message.get('tool_calls'):
    for tool_call in message['tool_calls']:
        tool_name = tool_call['function']['name']
        arguments = json.loads(tool_call['function']['arguments'])
        
        result = handle_mcp_function_call(tool_name, arguments, MEDIKODE_API_KEY)
        # Process result and send back to ChatGPT
```

#### 3. Example Integration

```python
class ChatGPTWithMCP:
    def __init__(self, openai_api_key, medikode_api_key):
        self.openai_client = openai.OpenAI(api_key=openai_api_key)
        self.medikode_api_key = medikode_api_key
        self.mcp_tools = self.get_mcp_tools()
    
    def get_mcp_tools(self):
        """Get MCP tools from server"""
        response = requests.get('http://localhost:3000/capabilities/openai-tools')
        return response.json()['tools']
    
    def chat_with_mcp(self, user_message):
        """Chat with MCP tools available"""
        response = self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": user_message}],
            tools=self.mcp_tools,
            tool_choice="auto"
        )
        
        # Handle tool calls if any
        if response.choices[0].message.tool_calls:
            for tool_call in response.choices[0].message.tool_calls:
                tool_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                
                # Call MCP server
                mcp_response = requests.post(
                    f'http://localhost:3000/mcp/tools/{tool_name}',
                    headers={
                        'Content-Type': 'application/json',
                        'x-api-key': self.medikode_api_key
                    },
                    json=arguments
                )
                
                # Process MCP response and continue conversation
                # ... (implementation depends on your setup)
        
        return response.choices[0].message.content
```

## Configuration

### Environment Variables

The MCP server uses these environment variables (in `.env`):

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# API Service Configuration
API_SERVICE_URL=http://localhost:3001
BACKEND_SERVICE_URL=http://localhost:3002

# Database Configuration
SQLITE_DB_PATH=./data/usage.db

# Security Configuration
ALLOWED_ORIGINS=*

# Logging Configuration
LOG_LEVEL=info
```

### API Keys

You'll need:
1. **OpenAI API Key** - For ChatGPT integration
2. **Medikode API Key** - For MCP server authentication

## Troubleshooting

### Common Issues

#### 1. MCP Server Not Starting

**Error**: `Failed to connect to localhost port 3000`

**Solutions**:
- Check if port 3000 is already in use: `lsof -i :3000`
- Ensure dependencies are installed: `npm install`
- Check environment configuration: `cat .env`

#### 2. API Key Authentication Failed

**Error**: `API key required` or `Invalid API key`

**Solutions**:
- Verify your Medikode API key is valid
- Check that the backend service is running on port 3002
- Ensure the API key has proper permissions

#### 3. Tool Processing Errors

**Error**: Tool calls return errors

**Solutions**:
- Check API service connectivity (port 3001)
- Validate input data format
- Review server logs for detailed error messages

#### 4. ChatGPT Integration Issues

**Error**: ChatGPT doesn't recognize MCP tools

**Solutions**:
- Verify tool definitions are fetched correctly
- Check that tools are properly registered with ChatGPT
- Ensure function calling is enabled in your ChatGPT setup

### Debug Commands

```bash
# Check MCP server health
curl http://localhost:3000/health

# Check detailed health
curl http://localhost:3000/health/detailed

# List available tools
curl http://localhost:3000/mcp/tools -H "x-api-key: YOUR_API_KEY"

# Test environment routing
cd /Users/muthuka/root/medikode.ai/allnew/mcp-server
npm run test:routing
```

### Logs

Check server logs for detailed error information:

```bash
# View server logs (if running in foreground)
# Or check Docker logs if using Docker
docker logs medikode-mcp-server

# Check SQLite usage logs
sqlite3 data/usage.db "SELECT * FROM mcp_usage_logs ORDER BY timestamp DESC LIMIT 10;"
```

## Advanced Usage

### Custom Tool Integration

You can extend the MCP server with custom tools by:

1. Adding tool definitions in `src/routes/capabilities.js`
2. Implementing tool logic in `src/routes/mcp.js`
3. Adding validation schemas

### Monitoring and Analytics

The MCP server logs all usage to SQLite:

```sql
-- View recent usage
SELECT * FROM mcp_usage_logs ORDER BY timestamp DESC LIMIT 10;

-- View usage by tool
SELECT tool_name, COUNT(*) as usage_count 
FROM mcp_usage_logs 
GROUP BY tool_name;

-- View usage by API key
SELECT api_key, COUNT(*) as usage_count 
FROM mcp_usage_logs 
GROUP BY api_key;
```

### Performance Optimization

- Use connection pooling for high-volume applications
- Implement caching for frequently accessed data
- Monitor memory usage and response times
- Consider load balancing for multiple MCP server instances

## Support

For issues and questions:
1. Check the health endpoints for service status
2. Review usage logs for request details
3. Test with the provided scripts
4. Contact the Medikode development team

## Example Workflows

### Complete Medical Coding Workflow

```python
# 1. Process patient chart
chart_result = mcp_client.process_chart(
    text="Patient chart text...",
    specialty="Cardiology"
)

# 2. Validate suggested codes
validation_result = mcp_client.validate_codes(
    patient_chart="Patient chart text...",
    human_coded_output="I21.9, I25.10, Z95.1"
)

# 3. Calculate RAF score
raf_result = mcp_client.calculate_raf(
    demographics="65-year-old male",
    illnesses="Acute MI, CAD, Diabetes",
    model="V28"
)

# 4. QA validate for denial risk
qa_result = mcp_client.qa_validate_codes(
    coded_input="I21.9, I25.10, Z95.1, 99213"
)
```

This completes the comprehensive testing guide for integrating the MCP server with ChatGPT on localhost:8004!
