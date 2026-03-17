# Branch comparison: fix-icons-raja vs our solution (issue-fix + SVG-only changes)

## Goal

Both branches render icons in diagrams **without requiring PNG conversion**: the API returns SVG (with optional external icon URLs), we inline those URLs as data URIs, store SVG, and the MCP app displays SVG so icons show.

---

## fix-icons-raja branch (Raja’s approach)

### Where inlining lives

- **`src/tools/diagram-store.ts`**: `inlineExternalImages(svg)` — no `baseUrl`.
- **`src/tools/shared.ts`**: Calls `inlineExternalImages(svg)` then `storeSvg(diagramId, inlinedSvg)`. No PNG, no Resvg.

### How icons are inlined

- Regex in diagram-store: `/(<image[^>]*?\s(?:xlink:)?href=")((https?:\/\/)[^"]+)(")/gi`
- Only **absolute `http://` or `https://`** URLs are matched and fetched.
- Root-relative (`/path/to/icon.png`) or relative (`./icon.png`, `assets/icon.png`) URLs are **not** inlined.
- Uses a **5s timeout** per icon fetch and **debug logging** (count inlined, failures).
- Store: `Map<string, string>` (SVG only). API: `retrieveSvg(id)`.

### Server / resource

- Diagram Result resource returns **only SVG** via `retrieveSvg(id)`.
- Diagram Viewer resource registers a **CSP fallback**: `resourceDomains: ["https://icons.terrastruct.com"]` so if inlining fails, the app can still load that CDN (if the host allows it).

### Pros

- Simple: SVG only, no PNG path, no Resvg dependency.
- Inlining lives in diagram-store (single place for “prepare SVG for storage”).
- Fetch timeout avoids hanging on bad icon URLs.
- CSP fallback for Terrastruct icon CDN when inlining fails.
- Clear debug logs for icon inlining.

### Cons

- **Only absolute HTTP(S) URLs** are inlined. If the API returns root-relative or relative icon URLs (e.g. `/assets/icon.png` or `./icons/foo.png`), they are left as-is and may not load in a sandboxed chat.
- No fallback when the API returns **PNG but not SVG** (unusual but possible); diagram would be “not found” for that resource.

---

## Our solution (issue-fix + “icons without PNG” changes)

### Where inlining lives

- **`src/tools/shared.ts`**: `inlineSvgImages(svg, baseUrl)` — uses `baseUrl` to resolve relative and root-relative URLs.
- **`src/tools/diagram-store.ts`**: Only storage; `storeSvg`, `storePng`, `retrieveDiagramAsset`. No inlining.

### How icons are inlined

- Regex: `/(href|xlink:href)=["']([^"']+)["']/g` — any `href`/`xlink:href` (not limited to `<image>`).
- **URL types supported:**
  - Absolute: `https://...`, `http://...`
  - Protocol-relative: `//cdn.example.com/icon.png`
  - Root-relative: `/path/icon.png` (resolved with `baseUrl`)
  - Relative: `./icon.png`, `assets/icon.png` (resolved with `baseUrl`)
- Skips already-safe: `data:`, `#`, `mailto:`, `javascript:`.
- No fetch timeout (could hang on a slow icon server).
- No dedicated debug log for inlining (only general `debugLog`).
- Store: `Map<string, StoredDiagramAsset>` with optional `svg` and `png`. API: `retrieveDiagramAsset(id)`.

### Server / resource

- Diagram Result returns **SVG first, PNG fallback**: `asset.svg ?? asset.png`. Supports hosts that only support raster.
- **Optional PNG**: when `ADM_STORE_PNG=true`, we also rasterize and store PNG (Resvg).
- When API returns PNG but not SVG, we **store that PNG** so the diagram still appears.
- No CSP for icon CDN.

### Pros

- **Full URL coverage**: relative and root-relative icon URLs are resolved with `baseUrl` and inlined, so icons work even when the API doesn’t use absolute URLs.
- **Resilience**: PNG fallback (optional or when API returns only PNG) and single resource API (`retrieveDiagramAsset`) keep diagrams viewable in more environments.
- Optional PNG keeps the door open for raster-only consumers without default cost.

### Cons

- Resvg remains a dependency when `ADM_STORE_PNG=true` or when API returns only PNG.
- No fetch timeout for icon URLs (risk of slow/broken icon servers).
- No CSP fallback for Terrastruct CDN if inlining fails.
- Less explicit debug logging for inlining.

---

## Side-by-side summary

| Aspect | fix-icons-raja | Our solution |
|--------|----------------|--------------|
| **URLs inlined** | Only `http://` and `https://` | Absolute, protocol-relative, root-relative, relative (with `baseUrl`) |
| **baseUrl** | Not used | Used for resolving non-absolute icon URLs |
| **PNG** | Never | Optional (`ADM_STORE_PNG`); fallback when API returns only PNG |
| **Store / API** | `Map<id, string>`, `retrieveSvg(id)` | `Map<id, StoredDiagramAsset>`, `retrieveDiagramAsset(id)` |
| **Icon fetch timeout** | 5s | None |
| **Debug logging (icons)** | Yes (count inlined, failures) | General only |
| **CSP fallback (icon CDN)** | Yes (`icons.terrastruct.com`) | No |
| **Resvg dependency** | No | Yes when PNG needed |

---

## Recommendation: keep our solution and adopt Raja’s improvements

**Keep our approach as the base** because:

1. **Correctness**: Inlining must handle **all** URL forms the API can return. Our `inlineSvgImages(svg, baseUrl)` supports relative and root-relative URLs; Raja’s regex does not. If the API (or a future version) serves icons from relative paths, only our solution would inline them and show icons in chat.
2. **Resilience**: Optional PNG and “API returns only PNG” fallback avoid “diagram not found” in edge cases and raster-only clients.
3. **Single resource contract**: `retrieveDiagramAsset` with `svg ?? png` keeps the server and MCP app consistent and flexible.

**Merge in from fix-icons-raja:**

1. **Icon fetch timeout** (e.g. 5s) in the code that fetches icon URLs (e.g. in `fetchAsDataUri` in shared.ts) to avoid hanging.
2. **CSP fallback** in the Diagram Viewer resource: `resourceDomains: ["https://icons.terrastruct.com"]` so a failed inline can still load from that CDN when the host allows it.
3. **Debug logging** for inlining: log how many URLs were found and how many were successfully inlined (and optionally failures), similar to Raja’s branch.

This yields: our URL handling and storage/resource design, plus Raja’s robustness (timeout, CSP, logging) without losing support for relative/root-relative icon URLs.
