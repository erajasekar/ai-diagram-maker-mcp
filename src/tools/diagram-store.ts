/**
 * In-memory store for generated diagram assets.
 * Allows the MCP App to fetch the image via readServerResource()
 * without embedding it in tool result content (which would cause
 * Cursor to render the image natively in the chat).
 */

const MAX_ENTRIES = 50;

export type StoredDiagramAsset = {
  svg?: { mimeType: "image/svg+xml"; text: string };
  png?: { mimeType: "image/png"; blob: string };
};

const store = new Map<string, StoredDiagramAsset>();

/** Strip the XML declaration from an SVG string so it can be safely parsed in HTML context. */
export function stripXmlDeclaration(svg: string): string {
  return svg.replace(/<\?xml[^?]*\?>\s*/i, "").trim();
}

export function storeSvg(diagramId: string, svg: string): void {
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
  const existing = store.get(diagramId);
  store.set(diagramId, {
    ...(existing ?? {}),
    svg: { mimeType: "image/svg+xml", text: stripXmlDeclaration(svg) },
  });
}

export function storePng(diagramId: string, pngBase64: string): void {
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
  const existing = store.get(diagramId);
  store.set(diagramId, {
    ...(existing ?? {}),
    png: { mimeType: "image/png", blob: pngBase64.trim() },
  });
}

export function retrieveDiagramAsset(diagramId: string): StoredDiagramAsset | undefined {
  return store.get(diagramId);
}
