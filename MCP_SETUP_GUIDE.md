# Medikode MCP Server Setup Guide

This guide provides step-by-step instructions for setting up and using the Medikode MCP Server with AI applications and assistants.

## What is MCP?

Model Context Protocol (MCP) is a standard for connecting AI assistants to external tools and data sources. The Medikode MCP Server exposes healthcare-specific tools that can be used by AI applications to:

- Process medical charts and suggest codes
- Validate medical coding accuracy
- Calculate Risk Adjustment Factor (RAF) scores
- Perform QA validation with denial risk assessment
- Parse and analyze Explanation of Benefits (EOB) documents

## Project Structure

The MCP server project includes the following key files and directories:

```
mcp-server/
├── src/
│   ├── middleware/
│   │   └── auth.js          # API key validation
│   ├── database/
│   │   └── usageLogger.js   # SQLite usage logging
│   └── routes/
│       ├── health.js        # Health check endpoints
│       ├── capabilities.js  # MCP capabilities
│       └── mcp.js          # MCP tool implementations
├── data/                    # SQLite database storage (auto-created)
├── .gitignore              # Git ignore rules
├── .env.example            # Environment template
├── Dockerfile              # Docker containerization
├── docker-compose.yml      # Local development setup
├── package.json            # Node.js dependencies
├── README.md               # Main documentation
├── MCP_SETUP_GUIDE.md      # This setup guide
└── DEPLOYMENT_SUMMARY.md   # Deployment overview
```

### Key Files Explained

- **`.gitignore`**: Excludes sensitive files (`.env`, `node_modules/`, database files) from version control
- **`env.example`**: Template for environment variables - copy to `.env` and configure
- **`package.json`**: Defines dependencies and scripts for the Node.js project
- **`Dockerfile`**: Container configuration for deployment
- **`docker-compose.yml`**: Local development environment with all services

## Quick Setup

### 1. Prerequisites

- Node.js 24+ installed
- Access to Medikode API service
- Valid Medikode API key

### 2. Install and Run

```bash
# Clone or navigate to the mcp-server directory
cd mcp-server

# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Edit .env file with your configuration
nano .env
```

### 3. Git Setup (Optional)

If you're setting up version control for the MCP server:

```bash
# Initialize git repository (if not already done)
git init

# The .gitignore file is already included to exclude:
# - node_modules/
# - .env files
# - SQLite database files
# - Log files
# - Build outputs
# - Editor files

# Add files to git
git add .

# Make initial commit
git commit -m "Initial MCP server setup"
```

### 4. Configure Environment

Edit the `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# API Service Configuration
API_SERVICE_URL=http://localhost:3001
BACKEND_SERVICE_URL=http://localhost:3002

# Database Configuration
SQLITE_DB_PATH=/app/data/usage.db

# Security Configuration
ALLOWED_ORIGINS=*
```

### 5. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Test the server is running
curl http://localhost:3000/health
```

**Expected Output:**
```json
{
  "status": "healthy",
  "service": "medikode-mcp-server",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 5.791688375,
  "memory": {...},
  "environment": "production"
}
```

### 6. Verify Installation

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test capabilities endpoint (should work without API key)
curl http://localhost:3000/capabilities

# Test root endpoint
curl http://localhost:3000/

# Test MCP tools endpoint (requires API key)
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3000/mcp/tools
```

**Expected Results:**
- Health endpoint: Returns server status and memory usage
- Capabilities endpoint: Returns available MCP tools and schemas
- Root endpoint: Returns basic service information
- MCP tools endpoint: Returns list of available tools (with valid API key)

## Using with AI Applications

### OpenAI Function Calling

The MCP server provides OpenAI-compatible tool definitions:

```python
import requests
import openai

# Get tool definitions
response = requests.get('http://localhost:3000/capabilities/openai-tools')
tools = response.json()['tools']

# Use with OpenAI
client = openai.OpenAI()

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

### Claude Integration

```python
import requests
import anthropic

# Get tool definitions
response = requests.get('http://localhost:3000/capabilities/openai-tools')
tools = response.json()['tools']

# Convert to Claude format
claude_tools = []
for tool in tools:
    claude_tools.append({
        "name": tool["function"]["name"],
        "description": tool["function"]["description"],
        "input_schema": tool["function"]["parameters"]
    })

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-3-sonnet-20240229",
    max_tokens=1000,
    messages=[
        {
            "role": "user",
            "content": "Process this patient chart: 'Patient presents with chest pain and shortness of breath. EKG shows ST elevation. Troponin levels elevated.'"
        }
    ],
    tools=claude_tools
)
```

### Direct API Usage

```bash
# Process a patient chart
curl -X POST http://localhost:3000/mcp/tools/process_chart \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "text": "Patient presents with chest pain and shortness of breath. EKG shows ST elevation. Troponin levels elevated.",
    "specialty": "Cardiology"
  }'
```

## Available Tools

### 1. process_chart

Analyzes patient chart text and suggests appropriate medical codes.

**Input:**
- `text` (required): Patient chart text
- `specialty` (optional): Medical specialty
- `taxonomy_code` (optional): NUCC taxonomy code
- `insurance` (optional): Insurance information

**Output:**
- ICD/CPT code suggestions
- Medical coding analysis
- Justification for coding decisions

### 2. validate_codes

Validates human-coded medical codes against patient documentation.

**Input:**
- `patient_chart` (required): Patient chart text
- `human_coded_output` (required): Codes to validate
- `specialty` (optional): Medical specialty
- `taxonomy_code` (optional): NUCC taxonomy code
- `insurance` (optional): Insurance information

**Output:**
- Validation results
- Accuracy assessment
- Recommendations for improvement

### 3. calculate_raf

Calculates Risk Adjustment Factor scores for patient populations.

**Input:**
- `demographics` (required): Patient demographic information
- `illnesses` (required): Patient conditions and diagnoses
- `model` (required): RAF model version (V28, V24, V22)

**Output:**
- RAF score calculation
- HCC category mappings
- Detailed breakdown by component

### 4. qa_validate_codes

Performs comprehensive QA validation of coded medical input with denial risk assessment.

**Input:**
- `coded_input` (required): Coded medical input to validate

**Output:**
- Validation results with denial risk assessment
- Issues found with severity levels
- Recommended changes for optimization
- Financial optimization notes

### 5. parse_eob

Parses and analyzes Explanation of Benefits (EOB) documents.

**Input:**
- `content` (required): EOB document content to parse

**Output:**
- Extracted key information from EOB
- Errors and warnings identified
- Financial details and payment information
- Structured analysis of EOB content

## Authentication

All MCP tool requests require a valid API key in the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3000/mcp/tools
```

## Error Handling

The MCP server returns structured error responses:

```json
{
  "error": "Validation error",
  "details": "Missing required field: text",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "medikode-mcp-server",
  "tool": "process_chart",
  "request_id": "uuid-here"
}
```

## Monitoring and Logging

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health with dependency checks
curl http://localhost:3000/health/detailed
```

### Usage Analytics

All tool usage is logged to SQLite with:
- Request/response data
- Processing times
- API key information
- Error details

## Production Deployment

### Docker Deployment

```bash
# Build image
docker build -t medikode-mcp-server .

# Run container
docker run -p 3000:3000 \
  -e API_SERVICE_URL=https://api.medikode.ai \
  -e BACKEND_SERVICE_URL=https://backend.medikode.ai \
  medikode-mcp-server
```

### Azure Container Apps

The MCP server is automatically deployed as part of the Medikode infrastructure:

```bash
# Deploy all services including MCP server
cd deploy
./update-azure-container-apps.sh
```

Access the production MCP server at: `https://mcp.medikode.ai`

## Development Best Practices

### Environment Management

1. **Never commit sensitive files**:
   - The `.gitignore` file excludes `.env` files, database files, and logs
   - Always use `env.example` as a template
   - Keep API keys and secrets in environment variables

2. **Database Management**:
   - SQLite database files are automatically created in the `data/` directory
   - Database files are excluded from git via `.gitignore`
   - For production, consider using external database services

3. **Logging and Monitoring**:
   - All tool usage is logged to SQLite for analytics
   - Use health check endpoints for monitoring
   - Review logs regularly for errors and performance issues

### Code Organization

- **Middleware**: Authentication and request processing
- **Routes**: API endpoints and tool implementations
- **Database**: Usage logging and analytics
- **Validation**: Input validation using Joi schemas

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure the server is running on the correct port
   - Check firewall settings
   - Verify API service connectivity

2. **Authentication Errors**
   - Verify API key is valid
   - Check backend service connectivity
   - Ensure API key has proper permissions

3. **Tool Processing Errors**
   - Validate input data format
   - Check API service health
   - Review error logs for details

4. **Database Issues**
   - Ensure `data/` directory exists and is writable
   - Check SQLite file permissions
   - Verify disk space availability
   - **Fix**: Make sure `SQLITE_DB_PATH` in `.env` uses relative path `./data/usage.db` for local development

5. **Environment Configuration**
   - Ensure `.env` file exists and is properly configured
   - Check that all required environment variables are set
   - Verify API service URLs are accessible
   - **Fix**: Copy `env.example` to `.env` and update paths for local development

6. **Path-to-Regexp Errors**
   - **Error**: `Missing parameter name at index 1: *`
   - **Cause**: Invalid route pattern in Express.js
   - **Fix**: Use proper route patterns (already fixed in the code)

7. **Authentication Issues**
   - **Error**: "API key required" for capabilities endpoint
   - **Cause**: Capabilities endpoint should be public for MCP discovery
   - **Fix**: Capabilities and root endpoints are now accessible without authentication

### Debug Mode

```bash
# Run with debug logging
DEBUG=* npm run dev

# Run with Node.js debugger
npm run dev:debug

# Check environment variables
node -e "console.log(process.env)"

# Test database connectivity
node -e "require('./src/database/usageLogger').initializeDatabase().then(() => console.log('DB OK')).catch(console.error)"
```

### Log Analysis

```bash
# View recent logs
tail -f logs/app.log

# Check SQLite database
sqlite3 data/usage.db "SELECT * FROM mcp_usage_logs ORDER BY timestamp DESC LIMIT 10;"

# Monitor health endpoints
curl http://localhost:3000/health/detailed
```

## Support

For technical support:
1. Check the health endpoints
2. Review server logs
3. Contact the Medikode development team

## Examples

### Complete Workflow Example

```python
import requests
import json

# MCP Server configuration
MCP_BASE_URL = "http://localhost:3000"
API_KEY = "your-api-key"

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

# 1. Process a patient chart
chart_data = {
    "text": "65-year-old male presents with chest pain radiating to left arm. EKG shows ST elevation in leads II, III, aVF. Troponin I elevated at 15.2 ng/mL.",
    "specialty": "Cardiology"
}

response = requests.post(
    f"{MCP_BASE_URL}/mcp/tools/process_chart",
    headers=headers,
    json=chart_data
)

if response.status_code == 200:
    result = response.json()
    print("Suggested codes:", result.get('suggested_codes', []))
    
    # 2. Validate the suggested codes
    validation_data = {
        "patient_chart": chart_data["text"],
        "human_coded_output": "I21.9, I25.10, Z95.1",
        "specialty": "Cardiology"
    }
    
    validation_response = requests.post(
        f"{MCP_BASE_URL}/mcp/tools/validate_codes",
        headers=headers,
        json=validation_data
    )
    
    if validation_response.status_code == 200:
        validation_result = validation_response.json()
        print("Validation result:", validation_result.get('validation_result', ''))
        
        # 3. Calculate RAF score
        raf_data = {
            "demographics": "65-year-old male, Medicare beneficiary",
            "illnesses": "Acute myocardial infarction, Coronary artery disease, Diabetes mellitus type 2",
            "model": "V28"
        }
        
        raf_response = requests.post(
            f"{MCP_BASE_URL}/mcp/tools/calculate_raf",
            headers=headers,
            json=raf_data
        )
        
        if raf_response.status_code == 200:
            raf_result = raf_response.json()
            print("RAF Score:", raf_result.get('raf', {}).get('final', 'N/A'))
            
            # 4. QA Validate the suggested codes
            qa_data = {
                "coded_input": "I21.9, I25.10, Z95.1, 99213"
            }
            
            qa_response = requests.post(
                f"{MCP_BASE_URL}/mcp/tools/qa_validate_codes",
                headers=headers,
                json=qa_data
            )
            
            if qa_response.status_code == 200:
                qa_result = qa_response.json()
                print("QA Validation:", qa_result.get('denial_risk', 'N/A'))
                
                # 5. Parse an EOB document
                eob_data = {
                    "content": "EOB document content with payment details, denials, and adjustments..."
                }
                
                eob_response = requests.post(
                    f"{MCP_BASE_URL}/mcp/tools/parse_eob",
                    headers=headers,
                    json=eob_data
                )
                
                if eob_response.status_code == 200:
                    eob_result = eob_response.json()
                    print("EOB Parsing completed successfully")
else:
    print("Error:", response.json())
```

This completes the setup and usage guide for the Medikode MCP Server!
