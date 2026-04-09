/**
 * In-memory store for generated diagram SVG.
 * The MCP App fetches the diagram via readServerResource(); chat clients
 * receive a PNG raster of the diagram in the tool result when rasterization succeeds.
 */

const MAX_ENTRIES = 50;

const store = new Map<string, string>();

/** Strip the XML declaration from an SVG string so it can be safely parsed in HTML context. */
export function stripXmlDeclaration(svg: string): string {
  return svg.replace(/<\?xml[^?]*\?>\s*/i, "").trim();
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
