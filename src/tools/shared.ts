import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { postApiV2DiagramsGenerate } from "../generated/adm-api.js";
import type { GenerateDiagramV2Request } from "../generated/model/index.js";
import { debugLog, isDebug, isMock } from "../debug.js";
import { storeSvg } from "./diagram-store.js";
import { getApiKey } from "../api-key-context.js";

export const DIAGRAM_APP_RESOURCE_URI = "ui://ai-diagram-maker/mcp-app.html";

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
  isIconEnabled?: boolean;
}

const ICON_FETCH_TIMEOUT_MS = 5000;

async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ICON_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        debugLog(`Icon fetch failed (${res.status}): ${url}`);
        return null;
      }
      const rawMime = res.headers.get("content-type") ?? "image/png";
      // Data URI media types must not contain spaces (e.g. "image/svg+xml; charset=utf-8").
      const mime = rawMime
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(";");
      const buf = Buffer.from(await res.arrayBuffer());
      return `data:${mime};base64,${buf.toString("base64")}`;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    debugLog(`Icon fetch error for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Inline external <image> href/xlink:href URLs so SVG renders inside chat sandboxes.
 * Supports absolute URLs and root-relative URLs (resolved against baseUrl).
 */
async function inlineSvgImages(svg: string, baseUrl: string): Promise<string> {
  // Match both single and double quotes.
  const hrefRe = /(href|xlink:href)=["']([^"']+)["']/g;

  const found = [...svg.matchAll(hrefRe)].map((m) => m[2]).filter(Boolean);
  if (found.length === 0) return svg;

  debugLog(`Inlining ${found.length} external image reference(s) in SVG`);

  const abs = [...new Set(found.filter((u) => /^https?:\/\//i.test(u)))];
  const protoRel = [...new Set(found.filter((u) => u.startsWith("//")))];
  const rootRel = [...new Set(found.filter((u) => u.startsWith("/")))];
  const rel = [
    ...new Set(
      found.filter((u) => {
        if (!u) return false;
        // Skip references we should not rewrite
        if (u.startsWith("data:")) return false;
        if (u.startsWith("#")) return false;
        if (u.startsWith("mailto:")) return false;
        if (u.startsWith("javascript:")) return false;
        // Already handled
        if (/^https?:\/\//i.test(u)) return false;
        if (u.startsWith("//")) return false;
        if (u.startsWith("/")) return false;
        // Likely relative asset path like "assets/foo.svg" or "./foo.png"
        return true;
      }),
    ),
  ];

  if (abs.length === 0 && protoRel.length === 0 && rootRel.length === 0 && rel.length === 0)
    return svg;

  const map = new Map<string, string>();

  await Promise.allSettled(
    [
      ...abs.map((u) => ({ key: u, url: u })),
      ...protoRel.map((u) => ({ key: u, url: `https:${u}` })),
      ...rootRel.map((p) => ({ key: p, url: new URL(p, baseUrl).toString() })),
      // Resolve truly relative URLs against baseUrl's origin.
      // Ensure trailing slash so URL resolution treats baseUrl as a directory.
      ...rel.map((p) => ({ key: p, url: new URL(p, `${baseUrl}/`).toString() })),
    ].map(async ({ key, url }) => {
      // Skip already-inlined URLs.
      if (key.startsWith("data:")) return;
      const dataUri = await fetchAsDataUri(url);
      if (dataUri) map.set(key, dataUri);
    }),
  );

  if (map.size === 0) return svg;

  debugLog(`Inlined ${map.size}/${found.length} external image(s) successfully`);

  return svg.replace(hrefRe, (match, attr: string, value: string) => {
    const data = map.get(value);
    return data ? `${attr}="${data}"` : match;
  });
}

/** Max UTF-8 length of SVG before skipping chat inline image (avoids huge tool payloads). */
const MAX_SVG_CHARS_FOR_INLINE_IMAGE = 900_000;

/**
 * Calls the AI Diagram Maker REST API and returns an MCP CallToolResult
 * with optional inline image (SVG) for chat clients, plus explanatory text.
 */
export async function generateDiagram(
  inputType: GenerateDiagramV2Request["inputType"],
  params: DiagramParams
): Promise<CallToolResult> {
  debugLog("Tool called:", { inputType, params: paramsForLog(params) });

  const apiKey = getApiKey();
  if (!apiKey) {
    const hint =
      process.env.PORT != null
        ? "Send your API key in the Authorization header (Bearer <key>) or X-ADM-API-Key header."
        : "Set the ADM_API_KEY environment variable.";
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `AI Diagram Maker API key is required. ${hint}`,
        },
      ],
    };
  }

  const requestBody: GenerateDiagramV2Request = {
    inputType,
    content: params.content,
    // Request SVG, then rasterize to PNG in this MCP server so icons render in chat.
    format: "svg",
    ...(params.prompt !== undefined && { prompt: params.prompt }),
    ...(params.diagramType !== undefined && {
      diagramType: params.diagramType,
    }),
    options: {
      saveDiagramEnabled: true,
      colorTheme: "pastel-layers",
      ...(isMock() && { useMock: true }),
      ...(isDebug() && { debug: true }),
      ...(params.isIconEnabled && { isIconEnabled: true }),
    },
  };

  debugLog("Request payload to AI Diagram Maker API:", payloadForLog(requestBody));

  const response = await postApiV2DiagramsGenerate(requestBody);

  const resData = response.data as {
    svg?: string;
    png?: string;
    text?: string;
    diagramUrl?: string;
    d2Code?: string;
  };
  const responseForLog = {
    status: response.status,
    data: {
      ...resData,
      ...(typeof resData.svg === "string" && { svg: truncateForLog(resData.svg) }),
      ...(typeof resData.d2Code === "string" && { d2Code: truncateForLog(resData.d2Code) }),
      ...(typeof resData.png === "string" && { png: truncateForLog(resData.png) }),
    },
  };
  debugLog("Generate diagram API response:", responseForLog);

  if (response.status === 200) {
    const { svg, text, diagramUrl } = response.data;

    const baseUrl = (process.env.ADM_BASE_URL ?? "https://app.aidiagrammaker.com").replace(
      /\/$/,
      ""
    );

    const content: CallToolResult["content"] = [];

    let inlinedSvg: string | undefined;
    if (svg) {
      inlinedSvg = await inlineSvgImages(svg, baseUrl);
    }

    let fullDiagramUrl: string | undefined;
    if (diagramUrl) {
      fullDiagramUrl = diagramUrl.startsWith("/") ? `${baseUrl}${diagramUrl}` : diagramUrl;
      if (inlinedSvg && fullDiagramUrl) {
        try {
          const diagramId = new URL(fullDiagramUrl).pathname.split("/").filter(Boolean).pop();
          if (diagramId) {
            storeSvg(diagramId, inlinedSvg);
          }
        } catch {
          // URL parsing failed; image unavailable in App
        }
      }
    }

    if (
      inlinedSvg &&
      inlinedSvg.length > 0 &&
      inlinedSvg.length <= MAX_SVG_CHARS_FOR_INLINE_IMAGE
    ) {
      content.push({
        type: "image",
        mimeType: "image/svg+xml",
        data: Buffer.from(inlinedSvg, "utf8").toString("base64"),
      });
    }

    let textContent = text ?? "";
    if (fullDiagramUrl) {
      textContent += `\n\nEdit diagram: ${fullDiagramUrl} (open in browser to view and edit)`;
    }
    if (textContent) {
      content.push({ type: "text", text: textContent });
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
