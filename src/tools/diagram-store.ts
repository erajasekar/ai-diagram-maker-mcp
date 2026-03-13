/**
 * In-memory store for generated diagram PNG data.
 * Allows the MCP App to fetch the image via readServerResource()
 * without embedding it in tool result content (which would cause
 * Cursor to render the image natively in the chat).
 */

const MAX_ENTRIES = 50;

const store = new Map<string, string>();

export function storePng(diagramId: string, png: string): void {
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
  store.set(diagramId, png);
}

export function retrievePng(diagramId: string): string | undefined {
  return store.get(diagramId);
}
