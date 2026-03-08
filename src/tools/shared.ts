import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { postApiV2DiagramsGenerate } from "../generated/adm-api.js";
import type { GenerateDiagramV2Request } from "../generated/model/index.js";

export const DIAGRAM_TYPES = [
  "flowchart",
  "sequence",
  "erd",
  "system_architecture",
  "network_architecture",
  "uml",
  "mindmap",
  "workflow",
] as const;

export type DiagramType = (typeof DIAGRAM_TYPES)[number];

/**
 * Shared parameters accepted by all diagram generation tools.
 */
export interface DiagramParams {
  content: string;
  prompt?: string;
  diagramType?: DiagramType;
}

/**
 * Calls the AI Diagram Maker REST API and returns an MCP CallToolResult
 * containing an inline base64 PNG image plus the explanatory text.
 */
export async function generateDiagram(
  inputType: GenerateDiagramV2Request["inputType"],
  params: DiagramParams
): Promise<CallToolResult> {
  const apiKey = process.env.ADM_API_KEY;
  if (!apiKey) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "ADM_API_KEY environment variable is not set. Please configure your AI Diagram Maker API key.",
        },
      ],
    };
  }

  const requestBody: GenerateDiagramV2Request = {
    inputType,
    content: params.content,
    format: "png",
    ...(params.prompt !== undefined && { prompt: params.prompt }),
    ...(params.diagramType !== undefined && {
      diagramType: params.diagramType,
    }),
  };

  const response = await postApiV2DiagramsGenerate(requestBody);

  if (response.status === 200) {
    const { png, text } = response.data;

    const content: CallToolResult["content"] = [];

    if (text) {
      content.push({ type: "text", text });
    }

    if (png) {
      content.push({
        type: "image",
        data: png,
        mimeType: "image/png",
      });
    }

    return { content };
  }

  // Handle error responses
  const errorData = response.data as {
    error?: string;
    details?: string;
    rateLimitError?: { retryAfter?: number };
  };

  let errorMessage = `API request failed with status ${response.status}`;

  if (errorData?.error) {
    errorMessage = errorData.error;
    if (errorData.details) {
      errorMessage += `: ${errorData.details}`;
    }
  }

  if (response.status === 429 && errorData?.rateLimitError?.retryAfter) {
    errorMessage += ` (retry after ${errorData.rateLimitError.retryAfter} seconds)`;
  }

  return {
    isError: true,
    content: [{ type: "text", text: errorMessage }],
  };
}
