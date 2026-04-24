import { useEffect, useRef, type ReactNode } from "react";
import rough from "roughjs";
import { cn } from "@/lib/utils";

interface SketchBubbleProps {
  children: ReactNode;
  /** Approximate width of the bubble in px (will scale on small screens). */
  width?: number;
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
      style={{ width, maxWidth: "92vw", aspectRatio: `${aspect}` }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full overflow-visible"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 flex items-center justify-center text-center px-10 md:px-14"
        style={{
          paddingTop: `${(18 / VIEWBOX_H) * 100}%`,
          paddingBottom: `${((VIEWBOX_H - BODY_BOTTOM) / VIEWBOX_H) * 100 + 6}%`,
        }}
      >
        <div className="comic-text text-2xl md:text-3xl lg:text-4xl leading-snug max-w-full break-words">
          {children}
        </div>
      </div>
    </div>
  );
}
