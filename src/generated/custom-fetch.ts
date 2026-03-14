/**
 * Custom fetch mutator for the AI Diagram Maker API.
 * API key: from request headers (HTTP transport) or ADM_API_KEY env (stdio).
 * Resolves base URL from ADM_BASE_URL (defaults to production).
 *
 * Returns the full { data, status, headers } shape that Orval's fetch
 * client expects for its discriminated-union response types.
 */

import { getApiKey } from "../api-key-context.js";

const DEFAULT_BASE_URL = "https://app.aidiagrammaker.com";

export async function customFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getApiKey();
  const baseUrl = (process.env.ADM_BASE_URL ?? DEFAULT_BASE_URL).replace(
    /\/$/,
    ""
  );

  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  // Orval's fetch client expects { data, status, headers } — the generated
  // response types are discriminated unions on `status`, so we always
  // return all three fields and let callers check `status`.
  return { data, status: response.status, headers: response.headers } as T;
}
