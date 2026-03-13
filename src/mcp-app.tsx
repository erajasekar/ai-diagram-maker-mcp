/**
 * MCP App UI for AI Diagram Maker — displays generated diagrams as rich interactive views.
 */
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

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
  const imageItem = result.content.find((c) => c.type === "image");

  const firstText = textItems[0]?.text ?? "";
  const urlMatch = firstText.match(/Edit diagram: (https?:\/\/\S+)/);
  const editUrl = urlMatch?.[1];
  const description = firstText.replace(/\n\nEdit diagram:.*$/s, "").trim();

  return {
    imageData: imageItem?.data,
    imageMimeType: imageItem?.mimeType,
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

function DiagramView({ state }: { state: DiagramState }) {
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
      {state.description && <p style={styles.description}>{state.description}</p>}
      {state.editUrl && (
        <a href={state.editUrl} target="_blank" rel="noopener noreferrer" style={styles.editLink}>
          Open in AI Diagram Maker →
        </a>
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
        setDiagramState({
          status: result.isError ? "error" : "success",
          ...parsed,
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

  return <DiagramView state={diagramState} />;
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
    margin: 0,
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

// Inject spinner keyframes
const styleTag = document.createElement("style");
styleTag.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleTag);

// ── Mount ─────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DiagramApp />
  </StrictMode>,
);
