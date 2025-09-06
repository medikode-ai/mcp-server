# Medikode MCP Server

A Model Context Protocol (MCP) server that exposes tool-based access to the Medikode healthcare SaaS platform. This server provides AI assistants and applications with structured access to medical coding, validation, and RAF calculation capabilities.

## Overview

The Medikode MCP Server acts as a bridge between AI applications and the Medikode healthcare platform, providing:

- **Medical Chart Processing**: Analyze patient charts and suggest ICD/CPT codes
- **Code Validation**: Validate medical codes against patient documentation
- **RAF Calculation**: Calculate Risk Adjustment Factor scores for patient populations
- **Usage Tracking**: Comprehensive logging and analytics for API usage
- **OpenAI Compatibility**: Structured tool definitions compatible with OpenAI's function calling

## Architecture

```
AI Application/Assistant
         ↓
   MCP Server (Port 3000)
         ↓
   API Service (Port 3001)
         ↓
   Backend Service (Port 3002)
         ↓
   PostgreSQL Database
```

## Features

### MCP Tools

1. **process_chart**
   - Processes patient chart text
   - Returns ICD/CPT code suggestions
   - Supports specialty-specific analysis
   - Includes medical coding justification

2. **validate_codes**
   - Validates human-coded medical codes
   - Compares against patient chart documentation
   - Provides accuracy assessment
   - Returns validation recommendations

3. **calculate_raf**
   - Calculates Risk Adjustment Factor scores
   - Supports multiple RAF models (V28, V24, V22)
   - Processes patient demographics and conditions
   - Returns detailed RAF breakdown

4. **qa_validate_codes**
   - Performs comprehensive QA validation of coded medical input
   - Provides denial risk assessment
   - Returns optimization recommendations
   - Identifies issues and recommended changes

5. **parse_eob**
   - Parses and analyzes Explanation of Benefits (EOB) documents
   - Extracts key information and financial details
   - Identifies errors and warnings
   - Provides structured analysis of EOB content

### Security & Authentication

- API key-based authentication via `x-api-key` header
- Integration with existing Medikode API key system
- Request validation and sanitization
- Comprehensive usage logging

### Monitoring & Analytics

- SQLite-based usage logging
- Request/response tracking
- Performance metrics
- Error monitoring
- Health check endpoints

## Quick Start

### Prerequisites

- Node.js 24+ 
- Docker (optional)
- Access to Medikode API service and backend service

### Local Development

1. **Install Dependencies**
   ```bash
   cd mcp-server
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Git Setup (Optional)**
   ```bash
   # Initialize git repository
   git init
   
   # The .gitignore file is already configured to exclude:
   # - node_modules/, .env files, database files, logs
   git add .
   git commit -m "Initial MCP server setup"
   ```

4. **Start the Server**
   ```bash
   npm run dev
   ```

5. **Test the Server**
   ```bash
   curl http://localhost:3000/health
   ```

### Docker Deployment

1. **Build and Run**
   ```bash
   docker build -t medikode-mcp-server .
   docker run -p 3000:3000 --env-file .env medikode-mcp-server
   ```

2. **Docker Compose (Full Stack)**
   ```bash
   docker-compose up -d
   ```

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with dependency checks

### Capabilities
- `GET /capabilities` - MCP server capabilities and tool schema
- `GET /capabilities/openai-tools` - OpenAI-compatible tool definitions

### MCP Tools
- `POST /mcp/tools/process_chart` - Process patient chart
- `POST /mcp/tools/validate_codes` - Validate medical codes
- `POST /mcp/tools/calculate_raf` - Calculate RAF score
- `POST /mcp/tools/qa_validate_codes` - QA validate coded input
- `POST /mcp/tools/parse_eob` - Parse EOB documents
- `GET /mcp/tools` - List available tools

## Usage Examples

### Process Chart

```bash
curl -X POST http://localhost:3000/mcp/tools/process_chart \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "text": "Patient presents with chest pain and shortness of breath...",
    "specialty": "Cardiology"
  }'
```

### Validate Codes

```bash
curl -X POST http://localhost:3000/mcp/tools/validate_codes \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "patient_chart": "Patient chart text...",
    "human_coded_output": "I10, E11.9, Z51.11"
  }'
```

### Calculate RAF

```bash
curl -X POST http://localhost:3000/mcp/tools/calculate_raf \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "demographics": "65-year-old male",
    "illnesses": "Diabetes, Hypertension, COPD",
    "model": "V28"
  }'
```

### QA Validate Codes

```bash
curl -X POST http://localhost:3000/mcp/tools/qa_validate_codes \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "coded_input": "99213, 99214, I10, E11.9, Z51.11"
  }'
```

### Parse EOB

```bash
curl -X POST http://localhost:3000/mcp/tools/parse_eob \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "content": "EOB document content here..."
  }'
```

## OpenAI Integration

The MCP server provides OpenAI-compatible tool definitions that can be used with OpenAI's function calling feature:

```python
import openai

# Get tool definitions
tools_response = requests.get('https://mcp.medikode.ai/capabilities/openai-tools')
tools = tools_response.json()['tools']

# Use with OpenAI
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Process this patient chart..."}],
    tools=tools,
    tool_choice="auto"
)
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `API_SERVICE_URL` | API service URL | `http://localhost:3001` |
| `BACKEND_SERVICE_URL` | Backend service URL | `http://localhost:3002` |
| `SQLITE_DB_PATH` | SQLite database path | `/app/data/usage.db` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |

### API Key Setup

The MCP server uses the same API key system as the main Medikode platform. API keys are validated against the backend service and must be included in the `x-api-key` header for all requests.

## Deployment

### Azure Container Apps

The MCP server is integrated into the Azure deployment pipeline:

1. **Build and Push**
   ```bash
   cd deploy
   ./update-azure-container-apps.sh
   ```

2. **Access**
   - Production: `https://mcp.medikode.ai`
   - Health Check: `https://mcp.medikode.ai/health`

### Manual Deployment

1. **Build Docker Image**
   ```bash
   docker build -t medikodeacr.azurecr.io/mcp-server:latest .
   docker push medikodeacr.azurecr.io/mcp-server:latest
   ```

2. **Deploy to Azure Container Apps**
   ```bash
   az containerapp update \
     --name mcp-app \
     --resource-group microservices-rg \
     --image medikodeacr.azurecr.io/mcp-server:latest
   ```

## Monitoring

### Usage Analytics

The server logs all tool usage to SQLite with the following information:
- Request/response data
- Processing times
- API key information
- Error details
- User agent and IP

### Health Monitoring

- Basic health: `GET /health`
- Detailed health: `GET /health/detailed`
- Dependency checks for API and backend services

## Development

### Project Structure

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
├── MCP_SETUP_GUIDE.md      # Detailed setup guide
└── DEPLOYMENT_SUMMARY.md   # Deployment overview
```

### Adding New Tools

1. **Define Tool Schema** in `src/routes/capabilities.js`
2. **Implement Tool Logic** in `src/routes/mcp.js`
3. **Add Validation** using Joi schemas
4. **Update Documentation**

### Testing

```bash
# Run tests
npm test

# Test with curl
curl -X POST http://localhost:3000/mcp/tools/process_chart \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{"text": "test chart"}'
```

## Troubleshooting

### Common Issues

1. **API Key Validation Failed**
   - Ensure backend service is running
   - Check API key format and validity
   - Verify network connectivity

2. **Tool Processing Errors**
   - Check API service connectivity
   - Validate request data format
   - Review error logs for details

3. **Database Issues**
   - Ensure data directory exists
   - Check SQLite permissions
   - Verify disk space

### Logs

```bash
# View container logs
docker logs medikode-mcp-server

# View Azure Container App logs
az containerapp logs show --name mcp-app --resource-group microservices-rg
```

## Support

For issues and questions:
- Check the health endpoints for service status
- Review usage logs for request details
- Contact the Medikode development team

## License

ISC License - See LICENSE file for details.
