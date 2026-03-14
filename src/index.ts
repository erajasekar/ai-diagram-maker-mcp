#!/usr/bin/env node
/**
 * AI Diagram Maker MCP Server — entry point.
 *
 * Supports two transports:
 *   stdio  (default) — for local use in Cursor, Claude Desktop, Claude Code
 *   http             — Streamable HTTP for remote / hosted deployments
 *
 * Usage:
 *   ai-diagram-maker-mcp                          # stdio
 *   ai-diagram-maker-mcp --transport http          # HTTP on $PORT or 3001
 *   ai-diagram-maker-mcp --transport http --port 8080
 */

import { createServer } from "./server.js";
import { logStartup } from "./debug.js";
import { runWithApiKey } from "./api-key-context.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  StreamableHTTPServerTransport,
} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer as createHttpServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

// ── CLI argument parsing ──────────────────────────────────────────────────────

function parseArgs(): { transport: "stdio" | "http"; port: number } {
  const args = process.argv.slice(2);
  let transport: "stdio" | "http" = "stdio";
  // $PORT is set by Railway, Render, Fly and other PaaS platforms.
  let port = parseInt(process.env.PORT ?? "3001", 10);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--transport" && args[i + 1]) {
      const value = args[i + 1];
      if (value === "stdio" || value === "http") {
        transport = value;
      } else {
        console.error(`Unknown transport: "${value}". Use "stdio" or "http".`);
        process.exit(1);
      }
      i++;
    } else if (args[i] === "--port" && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (!isNaN(parsed)) {
        port = parsed;
      }
      i++;
    }
  }

  return { transport, port };
}

// ── CORS ──────────────────────────────────────────────────────────────────────

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, mcp-session-id, Authorization, X-ADM-API-Key",
  );
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
}

// ── Transports ────────────────────────────────────────────────────────────────

async function startStdio(): Promise<void> {
  logStartup("stdio");
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stdio servers stay alive until the parent process closes the pipe.
}

async function startHttp(port: number): Promise<void> {
  // Keep one transport per session so we can re-use it for GET/DELETE.
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    setCorsHeaders(res);

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }

    // Health / readiness check for load balancers and Railway
    if (url.pathname === "/" || url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify({ status: "ok", server: "ai-diagram-maker-mcp" }),
      );
      return;
    }

    if (url.pathname !== "/mcp") {
      res.writeHead(404).end("Not found");
      return;
    }

    // Re-use existing session if the client sends one.
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport = sessionId ? sessions.get(sessionId) : undefined;

    if (!transport) {
      // New session — create a fresh server + transport pair.
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, transport!);
        },
      });

      transport.onclose = () => {
        if (transport?.sessionId) {
          sessions.delete(transport.sessionId);
        }
      };

      const mcpServer = createServer();
      await mcpServer.connect(transport);
    }

    await runWithApiKey(req.headers, () => transport!.handleRequest(req, res));
  });

  httpServer.listen(port, () => {
    logStartup("http");
    console.error(`[ADM MCP] Listening on http://0.0.0.0:${port}/mcp`);
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    httpServer.close(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    httpServer.close(() => process.exit(0));
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { transport, port } = parseArgs();

  if (transport === "http") {
    await startHttp(port);
  } else {
    await startStdio();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
