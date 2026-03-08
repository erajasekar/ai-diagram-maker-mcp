/**
 * Debug logging controlled by ADM_DEBUG env var.
 * Logs to stderr so they don't interfere with MCP JSON-RPC on stdout.
 * Cursor and other MCP clients can show stderr in server/MCP logs.
 */

const DEBUG_VALUES = new Set(["1", "true", "yes"]);

export function isDebug(): boolean {
  const raw = process.env.ADM_DEBUG;
  return Boolean(raw && DEBUG_VALUES.has(String(raw).toLowerCase()));
}

export function debugLog(...args: unknown[]): void {
  if (!isDebug()) return;
  const prefix = `[ADM MCP]`;
  if (args.length === 0) {
    console.error(prefix);
    return;
  }
  console.error(prefix, ...args);
}
