import { useEffect, useRef, type ReactNode } from "react";
import rough from "roughjs";
import { cn } from "@/lib/utils";

interface SketchBubbleProps {
  children: ReactNode;
  /**
   * CSS width for the bubble. Accepts a number (px) or any CSS length /
   * `min()` / `clamp()` expression so the caller can constrain by both
   * viewport width and viewport height to keep the bubble fully on screen.
   */
  width?: number | string;
  /** Color of the sketched stroke. */
  stroke?: string;
  /** Position of the tail along the bottom edge (0..1, 0=left, 1=right). */
  tailX?: number;
  className?: string;
}

const VIEWBOX_W = 540;
const VIEWBOX_H = 240;
const BODY_BOTTOM = 200;
const TREMBLE_INTERVAL_MS = 140;

export function SketchBubble({
  children,
  width = 520,
  stroke = "#1a1a1a",
  tailX = 0.62,
  className,
}: SketchBubbleProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

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

      const cx = VIEWBOX_W * tailX;
      const tipX = cx + 24;

      const bodyTop = 18;
      const bodyLeft = 24;
      const bodyRight = VIEWBOX_W - 24;
      const bodyBottom = BODY_BOTTOM;

      // Tail: a small triangle dropping below the bubble toward Buddha.
      const tail = rc.polygon(
        [
          [cx - 22, bodyBottom - 8],
          [tipX, bodyBottom + 36],
          [cx + 28, bodyBottom - 8],
        ],
        fillOpts,
      );
      svg.appendChild(tail);

      // Bubble body (rounded rect drawn with rough's path for hand-drawn feel).
      const r = 32;
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

      // Cover the seam between bubble and tail with a small white fill stroke.
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
  }, [stroke, tailX]);

  const aspect = VIEWBOX_W / VIEWBOX_H;

  return (
    <div
      className={cn("relative", className)}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        maxWidth: "92vw",
        aspectRatio: `${aspect}`,
        // Container query context so the text + padding can scale with the
        // bubble's actual rendered width, not just viewport breakpoints.
        containerType: "inline-size",
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full overflow-visible"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 flex items-center justify-center text-center"
        style={{
          // Padding scales with bubble width via container-query units.
          paddingTop: `${(14 / VIEWBOX_H) * 100}%`,
          paddingBottom: `${((VIEWBOX_H - BODY_BOTTOM) / VIEWBOX_H) * 100 + 4}%`,
          paddingLeft: "7cqi",
          paddingRight: "7cqi",
        }}
      >
        <div
          className="comic-text leading-tight max-w-full break-words"
          style={{
            // ~7% of the bubble width, clamped so the smallest bubbles still
            // read clearly and the largest ones don't go cartoonishly huge.
            fontSize: "clamp(0.95rem, 6.8cqi, 1.85rem)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
