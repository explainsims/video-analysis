/**
 * Export a Recharts SVG element as a PNG sized to landscape A4.
 *
 * The chart is forced onto a white background regardless of the page theme,
 * because exported plots need to print/share well. Theme-color tokens used by
 * Recharts (axes, tick labels, grid) are inlined onto the SVG copy as static
 * dark colors before serialization, so light-mode PNG output is consistent
 * even when the user is using dark mode.
 */

const A4_LANDSCAPE_PX = { width: 3508, height: 2480 }; // 300 dpi
const PADDING_PX = 160;

interface ExportOpts {
  /** Heading printed above the chart (e.g. project name + mode). */
  title?: string;
  /** Smaller line beneath the title (e.g. fit equation, sample count). */
  subtitle?: string;
  /** PNG filename; defaults to "graph.png". */
  filename?: string;
}

export async function exportSvgAsA4Png(
  svg: SVGSVGElement,
  opts: ExportOpts = {}
): Promise<void> {
  const filename = opts.filename ?? "graph.png";

  // Clone so we can safely mutate styles for export without disturbing the
  // live chart on the page.
  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Strip CSS variables — the cloned SVG is rendered detached so var(--…)
  // references won't resolve. Recolor everything to readable static values
  // suitable for a printed page.
  inlinePrintColors(clone);

  // Determine intrinsic chart size from the live SVG (Recharts sets these).
  const liveBox = svg.getBoundingClientRect();
  const intrinsicW = liveBox.width || 800;
  const intrinsicH = liveBox.height || 500;
  clone.setAttribute("width", String(intrinsicW));
  clone.setAttribute("height", String(intrinsicH));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const xml = new XMLSerializer().serializeToString(clone);
  const svgUrl =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);

  const img = await loadImage(svgUrl);

  const canvas = document.createElement("canvas");
  canvas.width = A4_LANDSCAPE_PX.width;
  canvas.height = A4_LANDSCAPE_PX.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't get 2D canvas context for export.");

  // White A4 page
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Optional title block at the top of the page
  let topReserve = PADDING_PX;
  if (opts.title) {
    ctx.fillStyle = "#0b1220";
    ctx.font = "700 56px Inter, system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(opts.title, PADDING_PX, PADDING_PX);
    topReserve = PADDING_PX + 84;
  }
  if (opts.subtitle) {
    ctx.fillStyle = "#475569";
    ctx.font = "500 32px ui-monospace, Menlo, monospace";
    ctx.textBaseline = "top";
    ctx.fillText(opts.subtitle, PADDING_PX, topReserve);
    topReserve += 60;
  }
  if (opts.title || opts.subtitle) topReserve += 24;

  // Fit the chart into the remaining page area with margin, preserve aspect.
  const availW = canvas.width - PADDING_PX * 2;
  const availH = canvas.height - topReserve - PADDING_PX;
  const scale = Math.min(availW / intrinsicW, availH / intrinsicH);
  const drawW = intrinsicW * scale;
  const drawH = intrinsicH * scale;
  const drawX = (canvas.width - drawW) / 2;
  const drawY = topReserve + (availH - drawH) / 2;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  await downloadCanvasPng(canvas, filename);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

async function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Couldn't encode PNG.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Walk a clone and replace any var()-based or theme colors with static print
 *  values: dark text and grey grid on a white background. */
function inlinePrintColors(root: SVGElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = root;
  while (node) {
    const el = node as SVGElement;
    const tag = el.tagName?.toLowerCase();
    if (tag === "text") {
      el.setAttribute("fill", "#0b1220");
      el.setAttribute("font-family", "Inter, system-ui, sans-serif");
    } else if (tag === "line" || tag === "path") {
      const stroke = el.getAttribute("stroke") ?? "";
      const fill = el.getAttribute("fill") ?? "";
      // Grid (dashed) → light grey; everything else keeps its color but
      // var()-based ones get a sane fallback.
      if (stroke.includes("var(") || stroke === "" || stroke === "currentColor") {
        el.setAttribute("stroke", el.classList.contains("recharts-cartesian-grid-horizontal") || el.classList.contains("recharts-cartesian-grid-vertical") ? "#e2e8f0" : "#475569");
      }
      if (fill.includes("var(")) {
        el.setAttribute("fill", "#ffffff");
      }
    } else if (tag === "rect") {
      const fill = el.getAttribute("fill") ?? "";
      if (fill.includes("var(")) el.setAttribute("fill", "#ffffff");
    }
    node = walker.nextNode();
  }
}
