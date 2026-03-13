import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { DIAGRAM_TYPES, DIAGRAM_APP_RESOURCE_URI, generateDiagram } from "./shared.js";

const inputSchema = {
  content: z
    .string()
    .min(1)
    .describe(
      "Natural language description of the diagram to generate. " +
        "Be descriptive — include components, relationships, data flows, etc. " +
        'Example: "Create a microservices architecture with API gateway, auth service, user service, and PostgreSQL database"'
    ),
  diagramType: z
    .enum(DIAGRAM_TYPES)
    .optional()
    .describe(
      "Preferred diagram type. Leave blank to let the AI infer the best type from your description."
    ),
  prompt: z
    .string()
    .optional()
    .describe(
      'Additional styling or layout instruction. Example: "Use left-to-right layout with pastel colors"'
    ),
  isIconEnabled: z
    .boolean()
    .optional()
    .describe(
      "Set to true when the user asks to include icons in the diagram."
    ),
};

export function registerGenerateTextTool(server: McpServer): void {
  registerAppTool(
    server,
    "generate_diagram_from_text",
    {
      description:
        "Generate a software engineering diagram from a natural language description. " +
        "Use this tool when: the user asks to 'create a diagram', 'show me a flowchart', " +
        "'visualise the architecture', uses the keyword 'adm' or 'ai diagram maker', " +
        "or asks for any visual representation of code, systems, processes or data flows. " +
        "Supported diagram types: flowchart, sequence, ERD, system architecture, " +
        "network architecture, UML, mindmap, workflow. Returns an inline PNG image.",
      inputSchema,
      _meta: { ui: { resourceUri: DIAGRAM_APP_RESOURCE_URI } },
    },
    async (args) => generateDiagram("text", args)
  );
}
