/**
 * MCP App UI for AI Diagram Maker — displays generated diagrams as rich interactive views.
 */
import React, { StrictMode, useEffect, useRef, useState } from "react";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import {
  APP_INFO,
  DEFAULT_SVG_BASE_WIDTH,
  DEFAULT_ZOOM,
  GLOBAL_MARKDOWN_STYLES,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  ZOOM_TRANSITION_DURATION,
  styles,
} from "./mcp-constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiagramState {
  status: "idle" | "loading" | "success" | "error";
  svgMarkup?: string;
  imageData?: string;
  imageMimeType?: string;
  description?: string;
  editUrl?: string;
  errorMessage?: string;
}

const ZOOM_ROUNDING_FACTOR = 100;

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDiagramResult(result: CallToolResult): Omit<DiagramState, "status"> {
  if (result.isError) {
    const msg = result.content.find((c) => c.type === "text")?.text ?? "Unknown error";
    return { errorMessage: msg };
  }

  const sc = result.structuredContent as
    | { editUrl?: string; descriptionMarkdown?: string }
    | undefined;
  if (sc && typeof sc.editUrl === "string" && sc.editUrl.length > 0) {
    const desc =
      typeof sc.descriptionMarkdown === "string" ? sc.descriptionMarkdown.trim() : "";
    return {
      description: desc || undefined,
      editUrl: sc.editUrl,
    };
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

function SvgView({ markup, zoom }: { markup: string; zoom: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !markup) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(markup, "image/svg+xml");
    const svgEl = doc.querySelector("svg") as SVGSVGElement | null;
    if (!svgEl) return;

    // Normalize SVG sizing and remember its intrinsic width for zooming.
    svgEl.style.width = "auto";
    svgEl.style.height = "auto";
    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");

    container.innerHTML = "";
    container.appendChild(svgEl);

    // Ensure viewBox includes all content to prevent clipping (e.g. titles cut off on the left).
    const bbox = svgEl.getBBox();
    if (bbox && (bbox.width > 0 || bbox.height > 0)) {
      const pad = 8;
      const x = bbox.x - pad;
      const y = bbox.y - pad;
      const w = bbox.width + pad * 2;
      const h = bbox.height + pad * 2;
      svgEl.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
    }
    const baseWidth = bbox?.width ? bbox.width + 16 : DEFAULT_SVG_BASE_WIDTH;
    svgEl.setAttribute("data-base-width", String(baseWidth));
  }, [markup]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const svgEl = container.querySelector("svg") as SVGSVGElement | null;
    if (!svgEl) return;

    // Use layout-based zoom so both X/Y scrollbars work correctly.
    const baseWidthAttr = svgEl.getAttribute("data-base-width");
    const baseWidth =
      (baseWidthAttr ? Number(baseWidthAttr) : svgEl.getBoundingClientRect().width || DEFAULT_SVG_BASE_WIDTH) ||
      DEFAULT_SVG_BASE_WIDTH;
    svgEl.style.width = `${baseWidth * zoom}px`;
    svgEl.style.height = "auto";
    svgEl.style.transition = `width ${ZOOM_TRANSITION_DURATION}s ease-out`;
  }, [zoom, markup]);

  return <div ref={containerRef} style={styles.svgContainer} />;
}

function ImageView({
  imageData,
  mimeType,
  zoom,
}: {
  imageData: string;
  mimeType?: string;
  zoom: number;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [baseWidth, setBaseWidth] = useState<number>(DEFAULT_SVG_BASE_WIDTH);

  return (
    <div style={styles.imageWrapper}>
      <img
        ref={imageRef}
        src={`data:${mimeType ?? "image/png"};base64,${imageData}`}
        alt="Generated diagram"
        onLoad={() => {
          const img = imageRef.current;
          if (!img) return;
          const intrinsicWidth = img.naturalWidth || img.getBoundingClientRect().width || DEFAULT_SVG_BASE_WIDTH;
          setBaseWidth(intrinsicWidth);
        }}
        style={{
          ...styles.image,
          width: `${baseWidth * zoom}px`,
          height: "auto",
          transition: `width ${ZOOM_TRANSITION_DURATION}s ease-out`,
        }}
      />
    </div>
  );
}

function DiagramView({ state, onOpenLink }: { state: DiagramState; onOpenLink: (url: string) => void }) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [zoomInput, setZoomInput] = useState(String(Math.round(DEFAULT_ZOOM * 100)));

  useEffect(() => {
    if (state.status === "success") {
      setZoom(DEFAULT_ZOOM);
      setZoomInput(String(Math.round(DEFAULT_ZOOM * 100)));
    }
  }, [state.status]);

  useEffect(() => {
    setZoomInput(String(Math.round(zoom * 100)));
  }, [zoom]);

  const canZoomIn = zoom < MAX_ZOOM;
  const canZoomOut = zoom > MIN_ZOOM;

  const handleZoomIn = () => {
    if (!canZoomIn) return;
    setZoom((z) => Math.min(Math.round((z + ZOOM_STEP) * ZOOM_ROUNDING_FACTOR) / ZOOM_ROUNDING_FACTOR, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    if (!canZoomOut) return;
    setZoom((z) => Math.max(Math.round((z - ZOOM_STEP) * ZOOM_ROUNDING_FACTOR) / ZOOM_ROUNDING_FACTOR, MIN_ZOOM));
  };

  const handleZoomReset = () => {
    setZoom(DEFAULT_ZOOM);
  };

  const applyZoomFromInput = () => {
    const parsed = Number(zoomInput);
    if (Number.isNaN(parsed)) {
      setZoomInput(String(Math.round(zoom * 100)));
      return;
    }

    const clampedPercent = Math.min(Math.max(parsed, MIN_ZOOM * 100), MAX_ZOOM * 100);
    const nextZoom = Math.round((clampedPercent / 100) * ZOOM_ROUNDING_FACTOR) / ZOOM_ROUNDING_FACTOR;
    setZoom(nextZoom);
  };

  if (state.status === "idle") return <IdleView />;
  if (state.status === "loading") return <LoadingView />;
  if (state.status === "error") return <ErrorView message={state.errorMessage!} />;

  return (
    <div style={styles.container}>
      <div style={styles.diagramContainer}>
        <div style={styles.canvas}>
          <div style={styles.diagramFrame}>
            <div style={styles.controlsOverlay}>
              <div style={styles.zoomControls}>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={!canZoomOut}
                  style={{
                    ...styles.zoomButton,
                    ...(canZoomOut ? {} : styles.zoomButtonDisabled),
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  className="zoom-input"
                  min={MIN_ZOOM * 100}
                  max={MAX_ZOOM * 100}
                  step={1}
                  value={zoomInput}
                  onChange={(e) => setZoomInput(e.target.value)}
                  onBlur={applyZoomFromInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  aria-label="Zoom percentage"
                  style={styles.zoomInput}
                />
                <span style={styles.zoomSuffix}>%</span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={!canZoomIn}
                  style={{
                    ...styles.zoomButton,
                    ...(canZoomIn ? {} : styles.zoomButtonDisabled),
                  }}
                >
                  +
                </button>
                <button type="button" onClick={handleZoomReset} style={styles.zoomReset}>
                  Reset
                </button>
              </div>
            </div>
            {state.svgMarkup && <SvgView markup={state.svgMarkup} zoom={zoom} />}
            {!state.svgMarkup && state.imageData && (
              <ImageView imageData={state.imageData} mimeType={state.imageMimeType} zoom={zoom} />
            )}
          </div>
        </div>
      </div>
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
    appInfo: APP_INFO,
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

        let svgMarkup: string | undefined;
        let imageData: string | undefined;
        let imageMimeType: string | undefined;

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
              const firstItem = resource.contents[0];
              if (firstItem) {
                const mime = (firstItem as { mimeType?: string }).mimeType;
                if (mime === "image/svg+xml" && "text" in firstItem) {
                  svgMarkup = firstItem.text as string;
                } else if ("blob" in firstItem) {
                  imageData = firstItem.blob as string;
                  imageMimeType = mime ?? "image/png";
                }
              }
            }
          } catch {
            // Image fetch failed; show description and link without image
          }
        }

        setDiagramState({
          status: result.isError ? "error" : "success",
          ...parsed,
          svgMarkup,
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

// Inject spinner keyframes + markdown prose styles
const styleTag = document.createElement("style");
styleTag.textContent = GLOBAL_MARKDOWN_STYLES;
document.head.appendChild(styleTag);

// ── Mount ─────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DiagramApp />
  </StrictMode>,
);
