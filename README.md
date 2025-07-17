# JIRA Updater with Claude AI

A command-line tool that helps you update JIRA issue descriptions using Claude AI for enhanced content generation and templating.

## Features

- 🤖 **Claude AI Integration**: Get AI-powered suggestions for JIRA issue descriptions
- 📝 **Interactive Templates**: Build structured issue descriptions with predefined sections
- 🔄 **Flexible Updates**: Replace or append to existing descriptions
- 🎨 **Content Editing**: Edit and improve existing content with Claude's help
- 📊 **User-Friendly Interface**: Interactive CLI with clear prompts and options

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Basic Usage

```bash
npm run dev ISSUE-KEY
```

Example:
```bash
npm run dev SOFFER-525
```

### Build and Run

```bash
npm run build
npm start ISSUE-KEY
```

## How It Works

1. **Fetch Issue**: Retrieves the current JIRA issue details
2. **Template Building**: Guides you through creating structured content sections
3. **Claude Integration**: Optionally uses Claude AI to generate or improve content
4. **Interactive Editing**: Allows you to edit, improve, or replace content
5. **Update Options**: Choose to replace or append to existing descriptions

## Configuration

The tool connects to JIRA at `https://jira.adeo.com`. Configuration can be found in `src/config/default-config.ts`.

## Project Structure

```
src/
├── ai/
│   └── claude-client.ts          # Claude AI integration
├── api/
│   └── jira-client.ts           # JIRA API client
├── config/
│   └── default-config.ts        # Configuration settings
├── templates/
│   └── template-builder.ts      # Template generation logic
├── types/
│   └── index.ts                 # Type definitions
├── ui/
│   └── user-interface.ts        # CLI interface
├── app.ts                       # Main application logic
└── index.ts                     # Entry point
```

## Scripts

- `npm run dev` - Run in development mode with tsx
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Build and run the compiled application
- `npm run lint` - Type check without emitting files
- `npm run clean` - Remove build artifacts

## Requirements

- Node.js 20+
- TypeScript 5+
- Access to JIRA instance
- Claude AI API access (optional but recommended)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` to check for type errors
5. Submit a pull request

## License

MIT License