/**
 * In-memory store for generated diagram SVG data.
 * Allows the MCP App to fetch the image via readServerResource()
 * without embedding it in tool result content (which would cause
 * Cursor to render the image natively in the chat).
 */
import { debugLog } from "../debug.js";

const MAX_ENTRIES = 50;
const ICON_FETCH_TIMEOUT_MS = 5000;

const store = new Map<string, string>();

/** Strip the XML declaration from an SVG string so it can be safely parsed in HTML context. */
export function stripXmlDeclaration(svg: string): string {
  return svg.replace(/<\?xml[^?]*\?>\s*/i, "").trim();
}

/**
 * Fetch a single external image URL and return a base64 data URI, or null on failure.
 * Handles both SVG and raster image responses.
 */
async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ICON_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        debugLog(`Icon fetch failed (${response.status}): ${url}`);
        return null;
      }
      const contentType = response.headers.get("content-type") ?? "image/svg+xml";
      // Normalise MIME type: strip parameters like charset
      const mimeType = contentType.split(";")[0].trim();
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:${mimeType};base64,${base64}`;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    debugLog(`Icon fetch error for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Scan an SVG string for `<image>` elements whose `href` or `xlink:href` attributes
 * reference external HTTP(S) URLs, fetch each one concurrently, and replace the
 * URL with an inline base64 data URI so the SVG renders without any network access.
 *
 * Failed fetches are silently skipped — the original URL is left in place so the
 * diagram still renders (icons may just be invisible inside a sandboxed iframe).
 */
export async function inlineExternalImages(svg: string): Promise<string> {
  // Match href="http(s)://..." and xlink:href="http(s)://..." inside <image> tags.
  // We collect unique URLs to avoid duplicate fetches.
  const urlPattern = /(<image[^>]*?\s(?:xlink:)?href=")((https?:\/\/)[^"]+)(")/gi;

  const urls = new Set<string>();
  for (const match of svg.matchAll(urlPattern)) {
    urls.add(match[2]);
  }

  if (urls.size === 0) return svg;

  debugLog(`Inlining ${urls.size} external icon(s) in SVG`);

  const replacements = new Map<string, string>();
  await Promise.all(
    [...urls].map(async (url) => {
      const dataUri = await fetchAsDataUri(url);
      if (dataUri) replacements.set(url, dataUri);
    })
  );

  if (replacements.size === 0) return svg;

  // Replace all occurrences of each URL in the SVG string
  let result = svg;
  for (const [url, dataUri] of replacements) {
    // Escape special regex characters in the URL
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), dataUri);
  }

  debugLog(`Inlined ${replacements.size}/${urls.size} icon(s) successfully`);
  return result;
}

export function storeSvg(diagramId: string, svg: string): void {
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
  store.set(diagramId, stripXmlDeclaration(svg));
}

export function retrieveSvg(diagramId: string): string | undefined {
  return store.get(diagramId);
}
