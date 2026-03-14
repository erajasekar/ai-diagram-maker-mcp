/**
 * Request-scoped API key for HTTP transport.
 * Uses AsyncLocalStorage so the key from HTTP headers is available in tool handlers.
 * For stdio transport, no context is set — callers fall back to process.env.ADM_API_KEY.
 */

import { AsyncLocalStorage } from "node:async_hooks";

const apiKeyStorage = new AsyncLocalStorage<string | undefined>();

/**
 * Extracts ADM API key from HTTP request headers.
 * Supports: Authorization: Bearer <key>, or X-ADM-API-Key: <key>
 */
export function apiKeyFromRequest(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  const auth = headers["authorization"];
  if (auth && typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || undefined;
  }
  const custom = headers["x-adm-api-key"];
  return (typeof custom === "string" ? custom : Array.isArray(custom) ? custom[0] : undefined)?.trim() || undefined;
}

/**
 * Returns the API key for the current request context.
 * - HTTP: from request headers (via runWithApiKey)
 * - stdio: from process.env.ADM_API_KEY
 */
export function getApiKey(): string | undefined {
  const fromContext = apiKeyStorage.getStore();
  if (fromContext !== undefined) return fromContext;
  return process.env.ADM_API_KEY;
}

/**
 * Runs the given callback with the API key from HTTP headers set in context.
 * Used by the HTTP request handler so tool invocations can read the key.
 */
export function runWithApiKey<T>(
  headers: Record<string, string | string[] | undefined>,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const key = apiKeyFromRequest(headers);
  return apiKeyStorage.run(key, fn) as T | Promise<T>;
}
