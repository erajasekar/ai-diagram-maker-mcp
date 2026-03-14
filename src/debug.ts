/**
 * Debug logging controlled by ADM_DEBUG env var.
 * Logs to stderr so they don't interfere with MCP JSON-RPC on stdout.
 * Cursor and other MCP clients can show stderr in server/MCP logs.
 */

const TRUTHY_VALUES = new Set(["1", "true", "yes"]);

function isTruthy(value: string | undefined): boolean {
  return Boolean(value && TRUTHY_VALUES.has(String(value).toLowerCase()));
}

export function isDebug(): boolean {
  return isTruthy(process.env.ADM_DEBUG);
}

export function isMock(): boolean {
  return isTruthy(process.env.ADM_MOCK);
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

/** Always-on startup banner — confirms the server started and shows active env flags. */
export function logStartup(transport: string): void {
  const apiKeySource =
    transport === "http"
      ? "from request headers (Authorization / X-ADM-API-Key)"
      : `env ADM_API_KEY ${process.env.ADM_API_KEY ? "set" : "NOT SET"}`;
  const flags = [
    `debug=${isDebug() ? "on (ADM_DEBUG)" : "off"}`,
    `mock=${isMock() ? "on (ADM_MOCK)" : "off"}`,
    `apiKey=${apiKeySource}`,
  ].join(", ");
  console.error(`[ADM MCP] Server started (transport=${transport}) — ${flags}`);
}
