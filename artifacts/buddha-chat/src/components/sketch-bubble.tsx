import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import rough from "roughjs";
import { cn } from "@/lib/utils";

type TailSide = "bottom" | "right";

interface SketchBubbleProps {
  children: ReactNode;
  /**
   * CSS width for the bubble. Accepts a number (px) or any CSS length /
   * `min()` / `clamp()` expression. Height auto-grows with content.
   */
  width?: number | string;
  /** Color of the sketched stroke. */
  stroke?: string;
  /** Horizontal position of a BOTTOM tail (0..1, 0=left, 1=right). */
  tailX?: number;
  /** Vertical position of a RIGHT tail (0..1, 0=top, 1=bottom). */
  tailY?: number;
  /** Which edge the tail comes out of. Default: "bottom". */
  tailSide?: TailSide;
  className?: string;
}

const TREMBLE_INTERVAL_MS = 140;
// How far the tail extends past the bubble body, in pixels.
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
  tailY = 0.65,
  tailSide = "bottom",
  className,
}: SketchBubbleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const isRightTail = tailSide === "right";

  // Measure container; height auto-sizes to content.
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
    const bodyRight = isRightTail ? W - TAIL_EXTRA : W - 4;
    const bodyBottom = isRightTail ? H - 4 : H - TAIL_EXTRA;
    if (bodyBottom <= bodyTop + 8 || bodyRight <= bodyLeft + 8) return;
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

      // Tail — drawn first so the body covers its inner edge.
      if (isRightTail) {
        const cy = bodyTop + (bodyBottom - bodyTop) * tailY;
        const tipY = cy + 14;
        const tail = rc.polygon(
          [
            [bodyRight - 8, cy - 22],
            [W - 4, tipY],
            [bodyRight - 8, cy + 28],
          ],
          fillOpts,
        );
        svg.appendChild(tail);
      } else {
        const cx = W * tailX;
        const tipX = cx + 24;
        const tail = rc.polygon(
          [
            [cx - 22, bodyBottom - 8],
            [tipX, H - 4],
            [cx + 28, bodyBottom - 8],
          ],
          fillOpts,
        );
        svg.appendChild(tail);
      }

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

      // White cover for the tail/body seam so the rough strokes don't show
      // a visible joint where the tail attaches.
      if (isRightTail) {
        const cy = bodyTop + (bodyBottom - bodyTop) * tailY;
        const cover = rc.line(bodyRight, cy - 18, bodyRight, cy + 24, {
          ...opts,
          stroke: "#ffffff",
          strokeWidth: 4,
        });
        svg.appendChild(cover);
      } else {
        const cx = W * tailX;
        const cover = rc.line(cx - 18, bodyBottom, cx + 24, bodyBottom, {
          ...opts,
          stroke: "#ffffff",
          strokeWidth: 4,
        });
        svg.appendChild(cover);
      }
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
  }, [size.w, size.h, stroke, tailX, tailY, isRightTail]);

  // For the BOTTOM tail, shift the whole bubble so the tail TIP sits at the
  // container's horizontal midpoint (the original behavior). For the RIGHT
  // tail the parent positions us absolutely, so no shift is needed.
  const transform = isRightTail
    ? undefined
    : `translateX(calc(${-((tailX - 0.5) * 100)}% - 24px))`;

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
      <div
        className="relative comic-text text-center break-words"
        style={{
          paddingTop: `${BODY_PAD_Y}px`,
          paddingBottom: `${BODY_PAD_Y + (isRightTail ? 0 : TAIL_EXTRA)}px`,
          paddingLeft: "7cqi",
          paddingRight: isRightTail ? `calc(7cqi + ${TAIL_EXTRA}px)` : "7cqi",
          fontSize: "clamp(0.95rem, 6.8cqi, 1.85rem)",
          lineHeight: 1.25,
          minHeight: `${BODY_MIN_H + (isRightTail ? 0 : TAIL_EXTRA)}px`,
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
