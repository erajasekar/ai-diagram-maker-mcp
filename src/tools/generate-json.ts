import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DIAGRAM_TYPES, generateDiagram } from "./shared.js";

const inputSchema = {
  content: z
    .string()
    .min(1)
    .describe(
      "A JSON string representing the structure to visualise. " +
        "This can be API response data, a database schema, a config file, " +
        "dependency tree, or any other structured JSON. " +
        'Example: \'{"users": [{"id": 1, "orders": [{"id": 101}]}]}\''
    ),
  prompt: z
    .string()
    .optional()
    .describe(
      'Instruction for how to interpret or render the JSON. ' +
        'Example: "Show as an entity relationship diagram with cardinality labels"'
    ),
  diagramType: z
    .enum(DIAGRAM_TYPES)
    .optional()
    .describe(
      "Preferred diagram type. Defaults to 'erd' for schemas and 'flowchart' for other JSON."
    ),
};

export function registerGenerateJsonTool(server: McpServer): void {
  server.tool(
    "generate_diagram_from_json",
    "Generate a diagram from a JSON structure. Use this tool when the user wants " +
      "to visualise JSON data such as API responses, database schemas, dependency trees, " +
      "configuration files, or any structured data. " +
      "Pass the raw JSON string as `content`. " +
      "Returns an inline PNG image.",
    inputSchema,
    async (args) => generateDiagram("json", args)
  );
}
