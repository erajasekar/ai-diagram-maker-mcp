import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DIAGRAM_TYPES, generateDiagram } from "./shared.js";

const inputSchema = {
  content: z
    .string()
    .min(1)
    .describe(
      "A Mermaid diagram definition to convert to D2. " +
        "Pass the raw Mermaid source (e.g. flowchart, sequenceDiagram, erDiagram). " +
        'Example: "flowchart LR\n  A --> B --> C"'
    ),
  prompt: z
    .string()
    .optional()
    .describe(
      "Optional instruction for layout or styling of the converted diagram."
    ),
  diagramType: z
    .enum(DIAGRAM_TYPES)
    .optional()
    .describe("Preferred diagram type for the converted D2 output."),
};

export function registerGenerateMermaidTool(server: McpServer): void {
  server.tool(
    "generate_diagram_from_mermaid",
    "Convert a Mermaid diagram definition into a D2 diagram and return a PNG image. " +
      "Use this tool when the user has existing Mermaid code (flowchart, sequenceDiagram, erDiagram, etc.) " +
      "and wants it converted to D2 or rendered as an image. " +
      "Pass the Mermaid source as content. Returns an inline PNG image.",
    inputSchema,
    async (args) => generateDiagram("mermaid", args)
  );
}
