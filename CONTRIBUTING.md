# Contributing to @medikode/mcp-server

Thank you for your interest in contributing to the Medikode MCP Server! We welcome contributions from the community and appreciate your help in making this project better.

## 🤝 How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Use the issue templates** when available
3. **Provide clear information** about the problem

When reporting bugs, please include:

- **Environment details**: Node.js version, OS, package version
- **Steps to reproduce**: Clear, numbered steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Error messages**: Full error logs if applicable
- **Screenshots**: If relevant to the issue

### Suggesting Features

For feature requests, please include:

- **Clear description** of the proposed feature
- **Use case**: Why is this feature needed?
- **Benefits**: How will this help users?
- **Implementation ideas**: Any thoughts on how to implement it

### Code Contributions

#### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mcp-server.git
   cd mcp-server
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/medikode/mcp-server.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```

#### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clean, readable code
   - Add tests for new functionality
   - Update documentation as needed
   - Follow the existing code style

3. **Test your changes**:
   ```bash
   npm test
   npm run test:routing
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

#### Code Style Guidelines

- **JavaScript**: Follow standard JavaScript conventions
- **Comments**: Add comments for complex logic
- **Error Handling**: Include proper error handling
- **Testing**: Add tests for new features
- **Documentation**: Update README and inline docs

#### Commit Message Format

We use conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add new MCP tool for EOB parsing
fix: resolve WebSocket connection timeout issue
docs: update installation instructions
```

#### Pull Request Guidelines

- **Clear title**: Describe what the PR does
- **Detailed description**: Explain the changes and why
- **Link issues**: Reference related issues with `Fixes #123`
- **Keep PRs focused**: One feature/fix per PR
- **Update tests**: Ensure all tests pass
- **Update documentation**: Update README/docs if needed

### Testing

Before submitting a PR, please ensure:

- [ ] All existing tests pass
- [ ] New tests are added for new functionality
- [ ] Code is properly formatted
- [ ] Documentation is updated
- [ ] No sensitive information is included

### Review Process

1. **Automated checks** must pass (tests, linting, etc.)
2. **Code review** by maintainers
3. **Testing** in different environments
4. **Approval** from at least one maintainer
5. **Merge** by maintainers

## 🛠 Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Git

### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/medikode/mcp-server.git
   cd mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   # Edit .env with your test API key
   ```

4. **Run in development mode**:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm start` - Start the server
- `npm run dev` - Start in development mode with nodemon
- `npm run test:routing` - Test environment routing
- `npm run debug` - Start with debugging enabled

### Testing

```bash
# Test WebSocket connection
node test-websocket.js

# Test ChatGPT integration
python test-chatgpt-integration.py

# Test environment routing
node test-environment-routing.js
```

## 📋 Project Structure

```
mcp-server/
├── src/                    # Source code
│   ├── database/          # Database utilities
│   ├── middleware/        # Express middleware
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   └── websocket/        # WebSocket handling
├── test-*.js             # Test files
├── index.js              # HTTP server entry point
├── mcp-server-stdio.js   # MCP stdio entry point
├── package.json          # Package configuration
└── README.md             # Documentation
```

## 🐛 Debugging

### Common Issues

1. **API Key Issues**:
   - Ensure `MEDIKODE_API_KEY` is set correctly
   - Check that the API key has proper permissions

2. **WebSocket Connection Issues**:
   - Verify the server is running
   - Check firewall settings
   - Ensure correct port configuration

3. **MCP Tool Issues**:
   - Check tool names match exactly
   - Verify input parameters
   - Review error logs

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Email**: support@medikode.ai for urgent issues

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the ISC License.

## 🙏 Recognition

Contributors will be recognized in:
- README acknowledgments
- Release notes
- GitHub contributors list

Thank you for contributing to the Medikode MCP Server! 🚀
