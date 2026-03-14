/**
 * MCP App UI for AI Diagram Maker — displays generated diagrams as rich interactive views.
 */
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiagramState {
  status: "idle" | "loading" | "success" | "error";
  imageData?: string;
  imageMimeType?: string;
  description?: string;
  editUrl?: string;
  errorMessage?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDiagramResult(result: CallToolResult): Omit<DiagramState, "status"> {
  if (result.isError) {
    const msg = result.content.find((c) => c.type === "text")?.text ?? "Unknown error";
    return { errorMessage: msg };
  }

  const textItems = result.content.filter((c) => c.type === "text");

  const firstText = textItems[0]?.text ?? "";
  const urlMatch = firstText.match(/Edit diagram: (https?:\/\/\S+)/);
  const editUrl = urlMatch?.[1];
  const description = firstText.replace(/\n\nEdit diagram:.*$/s, "").trim();

  return {
    description: description || undefined,
    editUrl,
  };
}

// ── Components ────────────────────────────────────────────────────────────────

function LoadingView() {
  return (
    <div style={styles.centered}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Generating diagram…</p>
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div style={styles.errorBox}>
      <strong>Error:</strong> {message}
    </div>
  );
}

function IdleView() {
  return (
    <div style={styles.centered}>
      <p style={styles.idleText}>Waiting for diagram generation…</p>
    </div>
  );
}

function DiagramView({ state, onOpenLink }: { state: DiagramState; onOpenLink: (url: string) => void }) {
  if (state.status === "idle") return <IdleView />;
  if (state.status === "loading") return <LoadingView />;
  if (state.status === "error") return <ErrorView message={state.errorMessage!} />;

  return (
    <div style={styles.container}>
      {state.imageData && (
        <img
          src={`data:${state.imageMimeType ?? "image/png"};base64,${state.imageData}`}
          alt="Generated diagram"
          style={styles.image}
        />
      )}
      {state.description && (
        <div className="md-prose" style={styles.description}>
          <Markdown>{state.description}</Markdown>
        </div>
      )}
      {state.editUrl && (
        <button onClick={() => onOpenLink(state.editUrl!)} style={styles.editLink}>
          Open in AI Diagram Maker →
        </button>
      )}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

function DiagramApp() {
  const [diagramState, setDiagramState] = useState<DiagramState>({ status: "idle" });

  const { app, error } = useApp({
    appInfo: { name: "AI Diagram Maker", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.onhostcontextchanged = (ctx) => {
        if (ctx.theme) applyDocumentTheme(ctx.theme);
        if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
        if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
      };

      app.ontoolinput = async () => {
        setDiagramState({ status: "loading" });
      };

      app.ontoolresult = async (result) => {
        const parsed = parseDiagramResult(result);

        let imageData: string | undefined;
        let imageMimeType = "image/png";

        if (!result.isError && parsed.editUrl) {
          try {
            const diagramId = new URL(parsed.editUrl).pathname
              .split("/")
              .filter(Boolean)
              .pop();
            if (diagramId) {
              const resource = await app.readServerResource({
                uri: `diagram://result/${diagramId}`,
              });
              const blobItem = resource.contents.find((c) => "blob" in c);
              if (blobItem && "blob" in blobItem) {
                imageData = blobItem.blob as string;
                imageMimeType = (blobItem as { mimeType?: string }).mimeType ?? "image/png";
              }
            }
          } catch {
            // Image fetch failed; show description and link without image
          }
        }

        setDiagramState({
          status: result.isError ? "error" : "success",
          ...parsed,
          imageData,
          imageMimeType,
        });
      };

      app.ontoolcancelled = () => {
        setDiagramState({ status: "idle" });
      };

      app.onerror = console.error;
    },
  });

  useEffect(() => {
    if (app) {
      const ctx = app.getHostContext();
      if (ctx?.theme) applyDocumentTheme(ctx.theme);
      if (ctx?.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
      if (ctx?.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
    }
  }, [app]);

  if (error) return <ErrorView message={error.message} />;
  if (!app) return <LoadingView />;

  return <DiagramView state={diagramState} onOpenLink={(url) => app.openLink({ url })} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    fontFamily: "var(--font-sans, system-ui, sans-serif)",
    color: "var(--color-text-primary, #1f2937)",
  },
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "120px",
    gap: "12px",
    color: "var(--color-text-primary, #6b7280)",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid var(--color-border-primary, #e5e7eb)",
    borderTop: "3px solid var(--color-accent, #2563eb)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    margin: 0,
    fontSize: "var(--font-text-md-size, 1rem)",
    color: "var(--color-text-primary, #6b7280)",
  },
  idleText: {
    margin: 0,
    fontSize: "var(--font-text-md-size, 1rem)",
    color: "var(--color-text-primary, #9ca3af)",
  },
  image: {
    maxWidth: "100%",
    height: "auto",
    borderRadius: "var(--border-radius-md, 6px)",
    display: "block",
  },
  description: {
    fontSize: "var(--font-text-md-size, 0.875rem)",
    lineHeight: "var(--font-text-md-line-height, 1.5)",
    color: "var(--color-text-primary, #374151)",
  },
  editLink: {
    display: "inline-block",
    fontSize: "var(--font-text-md-size, 0.875rem)",
    color: "var(--color-text-info, #2563eb)",
    textDecoration: "none",
    fontWeight: "500",
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  errorBox: {
    margin: "16px",
    padding: "12px",
    background: "var(--color-background-error, #fef2f2)",
    border: "1px solid var(--color-border-error, #fca5a5)",
    borderRadius: "var(--border-radius-md, 6px)",
    color: "var(--color-text-error, #dc2626)",
    fontSize: "var(--font-text-md-size, 0.875rem)",
  },
};

// Inject spinner keyframes + markdown prose styles
const styleTag = document.createElement("style");
styleTag.textContent = `
@keyframes spin { to { transform: rotate(360deg); } }

/* Markdown prose styles scoped to description container */
.md-prose { font-size: var(--font-text-md-size, 0.875rem); line-height: 1.6; color: var(--color-text-primary, #374151); }
.md-prose > *:first-child { margin-top: 0; }
.md-prose > *:last-child { margin-bottom: 0; }
.md-prose h1, .md-prose h2, .md-prose h3, .md-prose h4 {
  font-weight: 600;
  line-height: 1.3;
  margin: 0.75em 0 0.4em;
  color: var(--color-text-primary, #111827);
}
.md-prose h1 { font-size: 1.25em; }
.md-prose h2 { font-size: 1.1em; }
.md-prose h3 { font-size: 1em; }
.md-prose p { margin: 0.4em 0; }
.md-prose ul, .md-prose ol { margin: 0.4em 0; padding-left: 1.4em; }
.md-prose li { margin: 0.2em 0; }
.md-prose strong { font-weight: 600; }
.md-prose em { font-style: italic; }
.md-prose code {
  background: var(--color-background-secondary, #f3f4f6);
  border-radius: 3px;
  padding: 0.15em 0.35em;
  font-size: 0.9em;
  font-family: var(--font-mono, monospace);
}
.md-prose pre {
  background: var(--color-background-secondary, #f3f4f6);
  border-radius: var(--border-radius-md, 6px);
  padding: 0.75em 1em;
  overflow-x: auto;
  margin: 0.5em 0;
}
.md-prose pre code { background: none; padding: 0; }
.md-prose table { border-collapse: collapse; width: 100%; margin: 0.5em 0; font-size: 0.875em; }
.md-prose th, .md-prose td { border: 1px solid var(--color-border-primary, #e5e7eb); padding: 0.4em 0.75em; text-align: left; }
.md-prose th { background: var(--color-background-secondary, #f9fafb); font-weight: 600; }
.md-prose blockquote {
  border-left: 3px solid var(--color-border-primary, #d1d5db);
  margin: 0.5em 0;
  padding-left: 1em;
  color: var(--color-text-secondary, #6b7280);
}
.md-prose hr { border: none; border-top: 1px solid var(--color-border-primary, #e5e7eb); margin: 0.75em 0; }
`;
document.head.appendChild(styleTag);

// ── Mount ─────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DiagramApp />
  </StrictMode>,
);
