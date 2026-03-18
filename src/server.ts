import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { registerGenerateTextTool } from "./tools/generate-text.js";
import { registerGenerateJsonTool } from "./tools/generate-json.js";
import { registerGenerateAsciiTool } from "./tools/generate-ascii.js";
import { registerGenerateImageTool } from "./tools/generate-image.js";
import { registerGenerateMermaidTool } from "./tools/generate-mermaid.js";
import { DIAGRAM_APP_RESOURCE_URI } from "./tools/shared.js";
import { retrieveSvg } from "./tools/diagram-store.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_NAME = "ai-diagram-maker";
const SERVER_VERSION = "1.0.0";

// Resolve the dist directory for reading the bundled UI HTML.
// Works both from source (src/server.ts) and compiled (dist/server.js).
const DIST_DIR = import.meta.url.endsWith(".ts")
  ? join(dirname(fileURLToPath(import.meta.url)), "../dist")
  : dirname(fileURLToPath(import.meta.url));

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

  registerAppResource(
    server,
    "Diagram Viewer",
    DIAGRAM_APP_RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      const html = readFileSync(join(DIST_DIR, "mcp-app.html"), "utf-8");
      return {
        contents: [
          {
            uri: DIAGRAM_APP_RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  // Fallback if inlining fails: allow Terrastruct icon CDN.
                  resourceDomains: ["https://icons.terrastruct.com"],
                },
              },
            },
          },
        ],
      };
    },
  );

  server.resource(
    "Diagram Result",
    new ResourceTemplate("diagram://result/{diagramId}", { list: undefined }),
    async (uri, { diagramId }) => {
      const id = Array.isArray(diagramId) ? diagramId[0] : diagramId;
      const svg = id ? retrieveSvg(id) : undefined;
      if (!svg) throw new Error(`Diagram not found: ${id}`);
      return {
        contents: [{ uri: uri.href, mimeType: "image/svg+xml", text: svg }],
      };
    },
  );

  return server;
}
