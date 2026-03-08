# AI Diagram Maker MCP Server

MCP server for [AI Diagram Maker](https://aidiagrammaker.com) — generate beautiful software engineering diagrams directly inside Cursor, Claude Desktop, Claude Code, or any MCP-compatible AI agent.

## Features

- **4 tools** covering every input type: natural language text, JSON, ASCII art, and images
- **Inline PNG rendering** — diagrams appear directly in the chat, no downloads
- **8 diagram types**: flowchart, sequence, ERD, system architecture, network architecture, UML, mindmap, workflow
- Supports both **stdio** (local) and **HTTP/Streamable HTTP** (remote) transports

## Prerequisites

1. Node.js 18+
2. An [AI Diagram Maker](https://aidiagrammaker.com) account and API key

## Installation

### Option A — run directly with npx (no install)

```bash
ADM_API_KEY=your_api_key npx ai-diagram-maker-mcp
```

### Option B — global install

```bash
npm install -g ai-diagram-maker-mcp
```

## MCP Client Configuration

### Cursor

Add to your Cursor MCP settings (`~/.cursor/mcp.json` or via **Settings → MCP**):

```json
{
  "mcpServers": {
    "ai-diagram-maker": {
      "command": "npx",
      "args": ["-y", "ai-diagram-maker-mcp"],
      "env": {
        "ADM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

To enable debug logging (request params and API payload), add `"ADM_DEBUG": "1"` to the `env` object. View output in **Cursor → Output** panel, then select the **MCP** or **ai-diagram-maker** channel so you see the server’s stderr logs.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "ai-diagram-maker": {
      "command": "npx",
      "args": ["-y", "ai-diagram-maker-mcp"],
      "env": {
        "ADM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add ai-diagram-maker \
  --command "npx" \
  --args "-y,ai-diagram-maker-mcp" \
  --env ADM_API_KEY=your_api_key_here
```

### HTTP transport (remote / hosted)

Start the server in HTTP mode:

```bash
ADM_API_KEY=your_api_key npx ai-diagram-maker-mcp --transport http --port 3001
```

Then point your MCP client at `http://localhost:3001/mcp`.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADM_API_KEY` | Yes | — | Your AI Diagram Maker API key |
| `ADM_BASE_URL` | No | `https://app.aidiagrammaker.com` | Override for local/staging API |
| `ADM_DEBUG` | No | — | Set to `1`, `true`, or `yes` to log request parameters from the AI agent and the request payload sent to the AI Diagram Maker API. Logs go to stderr. |

## Tools

### `generate_diagram_from_text`

Generate a diagram from a natural language description.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | Natural language description of the diagram |
| `diagramType` | enum | No | flowchart, sequence, erd, system_architecture, network_architecture, uml, mindmap, workflow |
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

## Trigger Keywords

The AI agent will automatically select the right tool when you use phrases like:

- `adm ...`
- `ai diagram maker ...`
- `create a diagram of ...`
- `show me a flowchart / sequence diagram / ERD / architecture ...`
- `visualise / draw / diagram ...`

## Development

```bash
# Clone and install
git clone https://github.com/erajasekar/ai-diagram-maker-mcp.git
cd ai-diagram-maker-mcp
npm install

# Regenerate API client from OpenAPI spec
npm run generate

# Build
npm run build

# Run locally (stdio)
ADM_API_KEY=your_key npm start

# Run HTTP transport
ADM_API_KEY=your_key npm run start:sse
```

## License

MIT
