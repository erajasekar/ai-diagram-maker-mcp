import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DIAGRAM_TYPES, generateDiagram } from "./shared.js";

const inputSchema = {
  content: z
    .string()
    .min(1)
    .describe(
      "Either a public image URL or a base64 data URI of the image to convert. " +
        "Supported formats: JPEG, PNG, GIF, WebP. " +
        "For a URL: 'https://example.com/whiteboard.png'. " +
        "For a data URI: 'data:image/png;base64,iVBORw0KGgo...'"
    ),
  prompt: z
    .string()
    .optional()
    .describe(
      'Instruction describing what to extract or how to render the diagram. ' +
        'Example: "Convert this whiteboard photo into a clean sequence diagram"'
    ),
  diagramType: z
    .enum(DIAGRAM_TYPES)
    .optional()
    .describe(
      "Preferred output diagram type. Leave blank to let the AI decide based on the image content."
    ),
};

export function registerGenerateImageTool(server: McpServer): void {
  server.tool(
    "generate_diagram_from_image",
    "Convert an image (whiteboard photo, screenshot, hand-drawn sketch) into a clean diagram. " +
      "Use this tool when the user provides an image URL or base64-encoded image " +
      "and wants it converted to a proper software engineering diagram. " +
      "Accepts public image URLs or base64 data URIs (data:image/...;base64,...). " +
      "Returns an inline PNG image.",
    inputSchema,
    async (args) => generateDiagram("image", args)
  );
}
