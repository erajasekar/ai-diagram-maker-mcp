import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGenerateTextTool } from "./tools/generate-text.js";
import { registerGenerateJsonTool } from "./tools/generate-json.js";
import { registerGenerateAsciiTool } from "./tools/generate-ascii.js";
import { registerGenerateImageTool } from "./tools/generate-image.js";
import { registerGenerateMermaidTool } from "./tools/generate-mermaid.js";

const SERVER_NAME = "ai-diagram-maker";
const SERVER_VERSION = "1.0.0";

/**
 * Creates and configures the AI Diagram Maker MCP server.
 * Registers all five diagram generation tools.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {} },
      instructions:
        "This server generates software engineering diagrams using AI Diagram Maker (ADM). " +
        "Use the available tools to create diagrams from natural language descriptions, " +
        "JSON data, ASCII art, images, or Mermaid diagram definitions. " +
        "Trigger keywords: 'adm', 'ai diagram maker', 'create diagram', 'show diagram', " +
        "'visualise', 'draw a flowchart', 'sequence diagram', 'architecture diagram'. " +
        "When the user requests icons or mentions 'with icons', 'include icons', or 'add icons', " +
        "pass isIconEnabled: true to the tool — icon support is controlled by this parameter.",
    }
  );

  registerGenerateTextTool(server);
  registerGenerateJsonTool(server);
  registerGenerateAsciiTool(server);
  registerGenerateImageTool(server);
  registerGenerateMermaidTool(server);

  return server;
}
