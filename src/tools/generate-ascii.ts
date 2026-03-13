import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { DIAGRAM_TYPES, DIAGRAM_APP_RESOURCE_URI, generateDiagram } from "./shared.js";

const inputSchema = {
  content: z
    .string()
    .min(1)
    .describe(
      "Raw ASCII art diagram to convert into a polished visual diagram. " +
        "Include the full ASCII art as-is, with box-drawing characters, arrows, or plain text layout. " +
        "Example:\n" +
        "  +--------+     +--------+\n" +
        "  | Client | --> | Server |\n" +
        "  +--------+     +--------+"
    ),
  prompt: z
    .string()
    .optional()
    .describe(
      'Additional instruction for rendering. Example: "Use a dark theme and add icons"'
    ),
  diagramType: z
    .enum(DIAGRAM_TYPES)
    .optional()
    .describe(
      "Preferred diagram type. Leave blank to let the AI infer from the ASCII layout."
    ),
  isIconEnabled: z
    .boolean()
    .optional()
    .describe(
      "Set to true when the user asks to include icons in the diagram."
    ),
};

export function registerGenerateAsciiTool(server: McpServer): void {
  registerAppTool(
    server,
    "generate_diagram_from_ascii",
    {
      description:
        "Convert an ASCII art diagram into a polished visual diagram. " +
        "Use this tool when the user has an existing ASCII art representation of a system, " +
        "flow, or architecture and wants it rendered as a proper diagram. " +
        "Accepts box-drawing characters, arrow representations (-->, ==>), and plain text layouts. " +
        "Returns an inline PNG image.",
      inputSchema,
      _meta: { ui: { resourceUri: DIAGRAM_APP_RESOURCE_URI } },
    },
    async (args) => generateDiagram("ascii", args)
  );
}
