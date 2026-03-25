# AI Diagram Maker MCP Server

MCP server for [AI Diagram Maker](https://aidiagrammaker.com) — generate beautiful software engineering diagrams directly inside Cursor, Claude Desktop, Claude Code, or any MCP-compatible AI agent.

- [ai-diagram-maker-mcp](https://github.com/erajasekar/ai-diagram-maker-mcp) 🌐 ☁️ - Generate professional software diagrams from plain English descriptions. [![erajasekar/ai-diagram-maker-mcp MCP server](https://glama.ai/mcp/servers/erajasekar/ai-diagram-maker-mcp/badges/score.svg)](https://glama.ai/mcp/servers/erajasekar/ai-diagram-maker-mcp)

## Features

- **5 tools** covering every input type: natural language text, code, ASCII diagram, images, and Mermaid
- **Inline rendering** — diagrams appear directly in the chat using MCP Apps UI, no downloads
- **Diagram URL in responses** — open it in your browser to view and edit the diagram
- **5 diagram types**: flowchart, sequence, ERD, system architecture, UML
- Supports both **stdio** (local) and **HTTP/Streamable HTTP** (remote) transports

## Contents

- [Prerequisites](#prerequisites)
- [Hosted MCP server](#hosted-mcp-server)
- [Installation](#installation)
- [MCP client configuration](#mcp-client-configuration)
- [Environment variables](#environment-variables)
- [Tools](#tools)
- [Trigger keywords](#trigger-keywords)
- [Local developer setup](#local-developer-setup)
- [License](#license)

## Prerequisites

1. Node.js 18+
2. An [AI Diagram Maker](https://aidiagrammaker.com) account and API key

## Hosted MCP server

The public MCP endpoint is **https://mcp.aidiagrammaker.com/mcp** (Streamable HTTP). Nothing to install for this option.

### Authentication (HTTP)

For remote HTTP clients, send your API key on every request — **not** via environment variables:

- `X-ADM-API-Key: <your_api_key>` (recommended), or
- `Authorization: Bearer <your_api_key>`

Use the API key from your AI Diagram Maker account (see [Prerequisites](#prerequisites)).

### Remote server JSON example

Merge this into your client’s MCP config (replace the API key placeholder):

```json
{
  "mcpServers": {
    "ai-diagram-maker": {
      "url": "https://mcp.aidiagrammaker.com/mcp",
      "headers": {
        "X-ADM-API-Key": "YOUR_API_KEY"
      }
    }
  }
}
```

## Installation

### Option A — hosted server (recommended)

Use the [remote server JSON example](#remote-server-json-example) above and wire it into your client using [MCP client configuration](#mcp-client-configuration). No global install.

### Option B — run locally with npx

Nothing to install permanently — `npx` runs the package on demand. The package name is `ai-diagram-maker-mcp`; append `@latest` if you want every invocation to resolve the newest release (recommended for one-off runs and `claude mcp add`).

```bash
ADM_API_KEY=your_api_key npx ai-diagram-maker-mcp@latest
```

## MCP client configuration

### Cursor

#### Remote (recommended)

Add to `~/.cursor/mcp.json` or **Settings → MCP** using the [remote server JSON example](#remote-server-json-example). No environment variables are required for this setup.

#### Local (stdio)

```json
{
  "mcpServers": {
    "ai-diagram-maker": {
      "command": "npx",
      "args": ["-y", "ai-diagram-maker-mcp@latest"],
      "env": {
        "ADM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Optional: add `"ADM_DEBUG": "1"` to `env` for debug logging — see [Environment variables](#environment-variables).

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "ai-diagram-maker": {
      "command": "npx",
      "args": ["-y", "ai-diagram-maker-mcp@latest"],
      "env": {
        "ADM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Claude Code

#### macOS

```bash
claude mcp add ai-diagram-maker -t stdio -e ADM_API_KEY=<api_key> -- npx -y ai-diagram-maker-mcp@latest
```

#### Windows

```bash
claude mcp add ai-diagram-maker \
  --command "npx" \
  --args "-y,ai-diagram-maker-mcp@latest" \
  --env ADM_API_KEY=your_api_key_here
```

### HTTP transport (local or self-hosted)

To run an HTTP server yourself (same header-based auth as [Authentication (HTTP)](#authentication-http)):

```bash
npx ai-diagram-maker-mcp@latest --transport http
```

The server listens on `$PORT` or **3001**. Point clients at `/mcp` and send the API key with each request using the headers above.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADM_API_KEY` | Yes (stdio only) | — | Your AI Diagram Maker API key (stdio transport only; remote HTTP clients use headers — see [Authentication (HTTP)](#authentication-http)) |
| `ADM_BASE_URL` | No | `https://app.aidiagrammaker.com` | Override for local/staging API; also used as the base for diagram URLs in tool responses |
| `ADM_DEBUG` | No | — | Set to `1`, `true`, or `yes` to log request parameters from the AI agent and the payload sent to the AI Diagram Maker API. Logs go to **stderr**. In **Cursor**, open **Output**, choose the **MCP** or **ai-diagram-maker** channel to read the server logs. |

## Tools

### `generate_diagram_from_text`

Generate a diagram from a natural language description.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | Natural language description of the diagram |
| `diagramType` | enum | No | flowchart, sequence, erd, system_architecture, uml |
| `prompt` | string | No | Additional styling/layout instruction |

**Example prompts:**
- *"Create a microservices architecture with API gateway, auth service, user service, and PostgreSQL database"*
- *"Draw a sequence diagram for user login flow with JWT token generation"*
- *"adm show the CI/CD pipeline for a Next.js app deployed to Vercel"*

---

### `generate_diagram_from_json`

Convert a JSON structure into a diagram (great for API responses, database schemas, config files).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | JSON string to visualise |
| `prompt` | string | No | How to interpret the JSON |
| `diagramType` | enum | No | Preferred diagram type |

---

### `generate_diagram_from_ascii`

Convert ASCII art into a polished diagram.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | Raw ASCII art diagram |
| `prompt` | string | No | Rendering instructions |
| `diagramType` | enum | No | Preferred diagram type |

---

### `generate_diagram_from_image`

Convert a whiteboard photo, screenshot, or any image into a clean diagram.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | Public image URL or base64 data URI |
| `prompt` | string | No | What to extract or how to render |
| `diagramType` | enum | No | Preferred output diagram type |

---

### `generate_diagram_from_mermaid`

Convert a Mermaid diagram definition to D2 and return a PNG image.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | Mermaid diagram source (e.g. flowchart, sequenceDiagram, erDiagram) |
| `prompt` | string | No | Optional layout or styling instruction |
| `diagramType` | enum | No | Preferred diagram type for the converted output |

## Trigger keywords

The AI agent will automatically select the right tool when you use phrases like:

- `adm ...`
- `ai diagram maker ...`
- `create a diagram of ...`
- `show me a flowchart / sequence diagram / ERD / architecture ...`
- `visualise / draw / diagram ...`

## Local developer setup

Use these steps to clone the repo, build locally, and run the MCP server with Node.

### 1. Clone the repository

```bash
git clone https://github.com/erajasekar/ai-diagram-maker-mcp.git
cd ai-diagram-maker-mcp
```

### 2. Install dependencies

```bash
npm install
```

### 3. (Optional) Regenerate API client

If you change the AI Diagram Maker OpenAPI spec or config, regenerate the client:

```bash
npm run generate
```

### 4. Build

```bash
npm run build
```

This compiles TypeScript and builds the MCP app UI into `dist/`. The server entrypoint is `dist/index.js`.

### 5. Run the local MCP server

**stdio (default)** — for use with Cursor, Claude Desktop, etc.:

```bash
ADM_API_KEY=your_api_key node dist/index.js
```

Or use the npm script:

```bash
ADM_API_KEY=your_api_key npm start
```

**HTTP transport** — for remote clients or testing (same headers as [Authentication (HTTP)](#authentication-http)):

```bash
ADM_API_KEY=your_api_key node dist/index.js --transport http
```

Or:

```bash
ADM_API_KEY=your_api_key npm run start:http
```

The HTTP server listens on `$PORT` (default **3001**).

### 6. Use the local server in Cursor

Point Cursor at your built server via **Settings → MCP** (or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "ai-diagram-maker": {
      "command": "node",
      "args": ["/absolute/path/to/ai-diagram-maker-mcp/dist/index.js"],
      "env": {
        "ADM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Replace `/absolute/path/to/ai-diagram-maker-mcp` with the actual path to your cloned repo. After changing the config, restart Cursor or reload the MCP servers.

For debug logging, add `"ADM_DEBUG": "1"` to `env` — see [Environment variables](#environment-variables).

## License

MIT
