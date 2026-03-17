import type React from "react";

export const APP_INFO = {
  name: "AI Diagram Maker",
  version: "1.0.0",
} as const;

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.25;
export const DEFAULT_ZOOM = 0.5;
export const DEFAULT_SVG_BASE_WIDTH = 800;
export const ZOOM_TRANSITION_DURATION = 0.15;

export const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
    fontFamily: "var(--font-sans, system-ui, sans-serif)",
    color: "var(--color-text-primary, #374151)",
  },
  diagramContainer: {
    position: "relative",
    borderRadius: "var(--border-radius-lg, 10px)",
    border: "1px solid var(--color-border-primary, #e5e7eb)",
    background: "#f8fafc",
    padding: "12px",
    overflow: "auto",
    height: "520px",
  },
  controlsOverlay: {
    position: "absolute",
    top: "12px",
    right: "12px",
    zIndex: 10,
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(148,163,184,0.35)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
  },
  zoomControls: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
  },
  zoomButton: {
    width: "24px",
    height: "24px",
    borderRadius: "999px",
    border: "none",
    background: "white",
    color: "var(--color-text-primary, #0f172a)",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
  },
  zoomButtonDisabled: {
    opacity: 0.4,
    cursor: "default",
  },
  zoomLevel: {
    minWidth: "40px",
    textAlign: "center",
    fontSize: "12px",
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-secondary, #475569)",
  },
  zoomReset: {
    border: "none",
    background: "transparent",
    fontSize: "11px",
    padding: "0 6px",
    color: "var(--color-text-info, #2563eb)",
    cursor: "pointer",
    borderLeft: "1px solid rgba(148,163,184,0.35)",
  },
  canvas: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  diagramFrame: {
    position: "relative",
    margin: "0 auto",
    borderRadius: "var(--border-radius-xl, 12px)",
    background: "#ffffff",
    padding: "12px",
    boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
    display: "inline-block",
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
  svgContainer: {
    width: "100%",
    borderRadius: "var(--border-radius-md, 6px)",
    overflow: "visible",
  },
  imageWrapper: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
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

export const GLOBAL_MARKDOWN_STYLES = `
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

