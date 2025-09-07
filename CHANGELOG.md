# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions workflow for automated testing and publishing
- Enhanced error handling and logging
- Support for additional MCP clients

### Changed
- Improved documentation and examples
- Enhanced security measures

## [1.2.1] - 2024-09-07

### Added
- Initial public release of @medikode/mcp-server
- 5 MCP tools: validate_codes, qa_chart, parse_eob, score_raf, multi_validate
- Support for Claude Desktop, Cursor, and other MCP-compatible clients
- Comprehensive documentation and setup guides
- npm package with npx support

### Security
- Removed hardcoded API keys and sensitive information
- Environment variable-based configuration
- Secure API key validation

## [1.2.0] - 2024-09-07

### Added
- MCP server implementation with stdio transport
- WebSocket support for real-time communication
- Database integration for usage tracking
- Environment routing (sandbox/production)
- Comprehensive test suite

### Changed
- Refactored codebase for better maintainability
- Improved error handling and logging
- Enhanced API service integration

## [1.1.0] - 2024-09-06

### Added
- Initial MCP server implementation
- Basic tool support for medical coding
- API integration with Medikode backend

### Changed
- Updated dependencies and security patches
- Improved performance and reliability

## [1.0.0] - 2024-09-05

### Added
- Initial release
- Basic MCP server functionality
- Core medical coding tools
- Documentation and examples

---

## Version History

- **1.2.1**: First public npm release with clean codebase
- **1.2.0**: Internal release with full MCP implementation
- **1.1.0**: Beta release with core functionality
- **1.0.0**: Initial alpha release

## Migration Guide

### From 1.2.0 to 1.2.1

- **Breaking**: Removed hardcoded API keys - now requires `MEDIKODE_API_KEY` environment variable
- **Breaking**: Changed default API key environment variable from `MCP_API_KEY` to `MEDIKODE_API_KEY`
- **Added**: Public npm package availability
- **Added**: Enhanced documentation and examples

### From 1.1.0 to 1.2.0

- **Added**: Full MCP protocol implementation
- **Added**: WebSocket support
- **Added**: Database integration
- **Changed**: Improved error handling and logging

### From 1.0.0 to 1.1.0

- **Added**: Enhanced tool support
- **Added**: Better API integration
- **Changed**: Improved performance and reliability
