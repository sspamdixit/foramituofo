import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import rough from "roughjs";
import { cn } from "@/lib/utils";

interface SketchBubbleProps {
  children: ReactNode;
  /**
   * CSS width for the bubble. Accepts a number (px) or any CSS length /
   * `min()` / `clamp()` expression. The bubble's HEIGHT grows with the text
   * content, so this only constrains horizontal size.
   */
  width?: number | string;
  /** Color of the sketched stroke. */
  stroke?: string;
  /** Position of the tail along the bottom edge (0..1, 0=left, 1=right). */
  tailX?: number;
  className?: string;
}

const TREMBLE_INTERVAL_MS = 140;
// How far the tail extends below the bubble body, in pixels.
const TAIL_EXTRA = 36;
// Vertical breathing room above and below the text inside the body.
const BODY_PAD_Y = 18;
// Minimum height for the body (so 1-word answers don't look cramped).
const BODY_MIN_H = 96;

export function SketchBubble({
  children,
  width = 520,
  stroke = "#1a1a1a",
  tailX = 0.62,
  className,
}: SketchBubbleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Measure the container; height auto-sizes to its text content.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Redraw the rough bubble whenever size or styling changes.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || size.w < 4 || size.h < 4) return;

    const W = size.w;
    const H = size.h;
    const bodyTop = 4;
    const bodyLeft = 4;
    const bodyRight = W - 4;
    const bodyBottom = H - TAIL_EXTRA;
    if (bodyBottom <= bodyTop + 8) return;
    const r = Math.min(28, (bodyBottom - bodyTop) * 0.3);

    const baseSeed = Math.floor(Math.random() * 10_000);
    let frame = 0;
    let last = 0;
    let raf = 0;

    const draw = () => {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const rc = rough.svg(svg);

      const opts = {
        roughness: 2.4,
        bowing: 1.6,
        stroke,
        strokeWidth: 2.4,
        seed: baseSeed + frame,
      };
      const fillOpts = {
        ...opts,
        fill: "#ffffff",
        fillStyle: "solid",
      };

      const cx = W * tailX;
      const tipX = cx + 24;

      // Tail: tip lands at the very bottom of the SVG so the wrapper can
      // anchor it precisely above Buddha's head.
      const tail = rc.polygon(
        [
          [cx - 22, bodyBottom - 8],
          [tipX, H - 4],
          [cx + 28, bodyBottom - 8],
        ],
        fillOpts,
      );
      svg.appendChild(tail);

      // Bubble body — rounded rect drawn as a hand-drawn path.
      const path = [
        `M ${bodyLeft + r} ${bodyTop}`,
        `L ${bodyRight - r} ${bodyTop}`,
        `Q ${bodyRight} ${bodyTop} ${bodyRight} ${bodyTop + r}`,
        `L ${bodyRight} ${bodyBottom - r}`,
        `Q ${bodyRight} ${bodyBottom} ${bodyRight - r} ${bodyBottom}`,
        `L ${bodyLeft + r} ${bodyBottom}`,
        `Q ${bodyLeft} ${bodyBottom} ${bodyLeft} ${bodyBottom - r}`,
        `L ${bodyLeft} ${bodyTop + r}`,
        `Q ${bodyLeft} ${bodyTop} ${bodyLeft + r} ${bodyTop}`,
        `Z`,
      ].join(" ");
      const body = rc.path(path, fillOpts);
      svg.appendChild(body);

      // White cover for the tail/body seam.
      const cover = rc.line(cx - 18, bodyBottom, cx + 24, bodyBottom, {
        ...opts,
        stroke: "#ffffff",
        strokeWidth: 4,
      });
      svg.appendChild(cover);
    };

    const tick = (t: number) => {
      if (t - last > TREMBLE_INTERVAL_MS) {
        frame = (frame + 1) % 6;
        draw();
        last = t;
      }
      raf = requestAnimationFrame(tick);
    };

    draw();
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [size.w, size.h, stroke, tailX]);

  // Shift the whole bubble LEFT so the tail TIP — not the bubble center —
  // sits at the container's horizontal midpoint. Tail tip's x within the
  // bubble = tailX * W + 24, so the shift required = (tailX - 0.5) * W + 24.
  // Expressed in CSS: percentage of own width (for the variable part) plus a
  // fixed pixel offset (for the +24 tip overhang). This is exact at every
  // viewport without depending on JS measurement timing.
  const tailShiftPct = (tailX - 0.5) * 100; // e.g. 12 when tailX=0.62
  const transform = `translateX(calc(${-tailShiftPct}% - 24px))`;

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", className)}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        maxWidth: "92vw",
        transform,
        // Container query context so text padding scales with bubble width.
        containerType: "inline-size",
      }}
    >
      <svg
        ref={svgRef}
        width={size.w || 1}
        height={size.h || 1}
        viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        aria-hidden="true"
      />
      {/*
        Text is in normal flow, so the container's height grows with the
        content. Padding top == padding bottom (above the tail), so the text
        sits exactly in the middle of the BODY rectangle, regardless of how
        many lines it wraps to.
      */}
      <div
        className="relative comic-text text-center break-words"
        style={{
          paddingTop: `${BODY_PAD_Y}px`,
          paddingBottom: `${BODY_PAD_Y + TAIL_EXTRA}px`,
          paddingLeft: "7cqi",
          paddingRight: "7cqi",
          fontSize: "clamp(0.95rem, 6.8cqi, 1.85rem)",
          lineHeight: 1.25,
          minHeight: `${BODY_MIN_H + TAIL_EXTRA}px`,
          // Center text within the min-height when the message is short.
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="block max-w-full">{children}</span>
      </div>
    </div>
  );
}
