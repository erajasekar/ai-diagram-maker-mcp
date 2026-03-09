import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { postApiV2DiagramsGenerate } from "../generated/adm-api.js";
import type { GenerateDiagramV2Request } from "../generated/model/index.js";
import { debugLog, isMock } from "../debug.js";

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

const MAX_CONTENT_LOG_LENGTH = 2000;

/** Truncate content for safe logging (e.g. base64 image data). */
function truncateForLog(value: string): string {
  if (value.length <= MAX_CONTENT_LOG_LENGTH) return value;
  return `${value.slice(0, MAX_CONTENT_LOG_LENGTH)}... [truncated, total ${value.length} chars]`;
}

/** Build a payload copy safe for logging (truncate long content e.g. base64). */
function payloadForLog(
  body: GenerateDiagramV2Request
): Record<string, unknown> {
  const { content, ...rest } = body;
  const contentStr = typeof content === "string" ? content : String(content);
  return { ...rest, content: truncateForLog(contentStr) };
}

/** Params from agent, safe for logging. */
function paramsForLog(params: DiagramParams): Record<string, unknown> {
  return {
    ...params,
    content: truncateForLog(params.content),
  };
}

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
  debugLog("Tool called:", { inputType, params: paramsForLog(params) });

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
    options: {
      saveDiagramEnabled: true,
      ...(isMock() && { useMock: true }),
    },
  };

  debugLog("Request payload to AI Diagram Maker API:", payloadForLog(requestBody));

  const response = await postApiV2DiagramsGenerate(requestBody);

  if (response.status === 200) {
    const { png, text, diagramUrl } = response.data;

    const content: CallToolResult["content"] = [];

    let textContent = text ?? "";
    if (diagramUrl) {
      const baseUrl = (process.env.ADM_BASE_URL ?? "https://app.aidiagrammaker.com").replace(
        /\/$/,
        ""
      );
      const fullDiagramUrl = diagramUrl.startsWith("/")
        ? `${baseUrl}${diagramUrl}`
        : diagramUrl;
      textContent += `\n\nEdit diagram: ${fullDiagramUrl} (open in browser to view and edit)`;
    }
    if (textContent) {
      content.push({ type: "text", text: textContent });
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
