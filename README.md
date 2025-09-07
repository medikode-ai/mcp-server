# @medikode/mcp-server

[![npm version](https://badge.fury.io/js/%40medikode%2Fmcp-server.svg)](https://badge.fury.io/js/%40medikode%2Fmcp-server)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![GitHub stars](https://img.shields.io/github/stars/medikode/mcp-server.svg)](https://github.com/medikode/mcp-server/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/medikode/mcp-server.svg)](https://github.com/medikode/mcp-server/issues)

Model Context Protocol (MCP) server for Medikode's AI-driven medical coding platform. This package enables AI assistants like Claude Desktop, Cursor, and ChatGPT to access Medikode's medical coding tools directly.

## 🌟 Features

- **5 Powerful MCP Tools**: Validate codes, QA charts, parse EOBs, calculate RAF scores, and more
- **AI Assistant Integration**: Works with Claude Desktop, Cursor, ChatGPT, and other MCP-compatible clients
- **Secure**: Uses your existing Medikode API keys with the same security and access controls
- **Fast**: Direct API access with caching for optimal performance
- **Easy Setup**: Simple configuration with npx - no local installation required

## 🚀 Quick Start

### Installation

```bash
npm install -g @medikode/mcp-server
```

### Configuration

#### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "medikode": {
      "command": "npx",
      "args": ["-y", "@medikode/mcp-server"],
      "env": {
        "MEDIKODE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Cursor IDE

Add to your `cursor_settings.json`:

```json
{
  "mcp": {
    "servers": {
      "medikode": {
        "command": "npx",
        "args": ["-y", "@medikode/mcp-server"],
        "env": {
          "MEDIKODE_API_KEY": "your_api_key_here"
        }
      }
    }
  }
}
```

## 🛠 Available Tools

### 1. `validate_codes`
Validates CPT/ICD-10 codes against clinical documentation.

**Inputs:**
- `chart_text` (string, required): Provider note or chart excerpt
- `codes` (array[string], required): CPT/ICD-10 codes to validate

**Outputs:**
- `valid` (boolean): Whether codes are valid for the chart
- `recommendations` (array[string]): Missing or conflicting codes

### 2. `qa_chart`
Performs a coding quality assurance check.

**Inputs:**
- `chart_text` (string, required): Clinical documentation to review

**Outputs:**
- `issues_found` (array[string]): Documentation or coding gaps
- `suggested_codes` (array[string]): Recommended additional codes

### 3. `parse_eob`
Extracts structured data from Explanation of Benefits (EOB) documents.

**Inputs:**
- `eob_content` (string, required): Raw EOB text (or PDF extracted text)

**Outputs:**
- `payer` (string): Insurance payer name
- `claim_number` (string): Claim reference number
- `total_billed` (number): Total amount billed
- `total_allowed` (number): Total amount allowed by payer
- `insurance_paid` (number): Amount paid by insurance
- `patient_responsibility` (number): Patient out-of-pocket amount

### 4. `score_raf`
Calculates RAF score and HCC capture from encounter documentation.

**Inputs:**
- `chart_text` (string, required): Clinical encounter documentation

**Outputs:**
- `raf_score` (float): Risk Adjustment Factor score
- `hcc_codes` (array[string]): Hierarchical Condition Category codes

### 5. `multi_validate`
Composite workflow that validates chart coding and calculates RAF in one step.

**Inputs:**
- `chart_text` (string, required): Clinical documentation
- `codes` (array[string], optional): Optional codes to validate

**Outputs:**
- `validation_results` (object): Results from validate_codes
- `raf_results` (object): Results from score_raf

## 💡 Example Usage

Once configured, you can use the tools in your AI assistant:

```
User: "Validate these codes for this chart: 99213, I10, E11.9"

AI: I'll help you validate those codes using the validate_codes tool...
[Tool call to validate_codes]

Based on the validation results:
- Code 99213: Valid for established patient office visit
- Code I10: Valid for essential hypertension
- Code E11.9: Valid for type 2 diabetes without complications
```

## 🔑 Authentication

All tools require a valid Medikode API key. You can obtain one by:

1. Signing up at [medikode.ai](https://medikode.ai)
2. Generating an API key in your account settings
3. Setting the `MEDIKODE_API_KEY` environment variable

## 📊 Usage Tracking

All MCP tool usage is tracked and appears in your Medikode dashboard alongside regular API calls. This includes:

- Number of API calls made
- Charts processed
- EOBs parsed
- RAF scores calculated

## 🔧 Troubleshooting

### Common Issues

**MCP Server Not Found**
- Ensure Node.js and npm are installed
- Verify the package is available via npx: `npx @medikode/mcp-server --help`

**Authentication Errors**
- Check that your API key is correct and active
- Verify the `MEDIKODE_API_KEY` environment variable is set
- Ensure your API key has the required permissions

**Tool Not Available**
- Restart your AI client after configuration changes
- Verify the MCP server configuration is correct
- Ensure your AI client supports MCP

## 📚 Documentation

- [Medikode Documentation](https://docs.medikode.ai)
- [MCP Tools Guide](https://mcp.medikode.ai)
- [API Reference](https://docs.medikode.ai/api)

## 🛠 Development

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Medikode API key

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/medikode/mcp-server.git
   cd mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your API key
   ```

4. **Run in development mode:**
   ```bash
   npm run dev
   ```

5. **Test the MCP server:**
   ```bash
   npm run test:routing
   ```

### Building

```bash
npm run build
```

### Testing

```bash
# Test WebSocket connection
node test-websocket.js

# Test ChatGPT integration
python test-chatgpt-integration.py

# Test environment routing
node test-environment-routing.js
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Use ESLint for JavaScript linting
- Follow the existing code style
- Add tests for new features
- Update documentation as needed

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/medikode/mcp-server/issues) with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)

## 💡 Feature Requests

Have an idea for a new feature? We'd love to hear it! Please [open an issue](https://github.com/medikode/mcp-server/issues) with:

- Clear description of the feature
- Use case and benefits
- Any implementation ideas you have

## 📊 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/medikode/mcp-server/issues)
- **Documentation**: [docs.medikode.ai](https://docs.medikode.ai)
- **Email**: support@medikode.ai
- **Discord**: [Join our community](https://discord.gg/medikode)

## 📄 License

ISC License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Website](https://medikode.ai)
- [Documentation](https://docs.medikode.ai)
- [MCP Tools](https://mcp.medikode.ai)
- [GitHub](https://github.com/medikode/mcp-server)
- [npm Package](https://www.npmjs.com/package/@medikode/mcp-server)

## 🙏 Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io/)
- Powered by [Medikode](https://medikode.ai) medical coding platform
- Thanks to all our contributors and users!