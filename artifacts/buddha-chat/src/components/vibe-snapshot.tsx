import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Video, Square } from "lucide-react";
import type { Vibe } from "@/hooks/use-vibe";
import type { PreachSong } from "@/hooks/use-preach-song";
import { cn } from "@/lib/utils";

const SNAP_PALETTES: Record<
  Vibe,
  { a: string; b: string; d: string; text: string }
> = {
  calm:       { a: "hsl(40,70%,85%)",  b: "hsl(32,60%,80%)",  d: "hsl(45,80%,93%)",  text: "#5a3212" },
  joyful:     { a: "hsl(42,95%,75%)",  b: "hsl(20,90%,72%)",  d: "hsl(50,100%,88%)", text: "#4a1e08" },
  melancholy: { a: "hsl(225,55%,35%)", b: "hsl(210,50%,42%)", d: "hsl(220,60%,20%)", text: "#f0e8d0" },
  fiery:      { a: "hsl(10,88%,65%)",  b: "hsl(355,80%,55%)", d: "hsl(345,75%,48%)", text: "#fff5e0" },
  bliss:      { a: "hsl(320,75%,85%)", b: "hsl(290,60%,80%)", d: "hsl(340,75%,90%)", text: "#5c1944" },
  deep:       { a: "hsl(270,55%,38%)", b: "hsl(195,65%,33%)", d: "hsl(240,60%,20%)", text: "#f0e8ff" },
  chill:      { a: "hsl(150,55%,78%)", b: "hsl(180,50%,76%)", d: "hsl(190,55%,85%)", text: "#0a3832" },
};

const VIBE_ICONS: Record<Vibe, string> = {
  calm: "☁️", joyful: "☀️", melancholy: "🌧️",
  fiery: "🔥", bliss: "🌸", deep: "🌌", chill: "🍃",
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface VibeSnapshotProps {
  vibe: Vibe;
  song: PreachSong | null;
  currentLyric: string;
  lastBuddhaMessage: string;
  onClose: () => void;
}

export function VibeSnapshot({
  vibe,
  song,
  currentLyric,
  lastBuddhaMessage,
  onClose,
}: VibeSnapshotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRafRef = useRef<number>(0);
  const recordRafRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  const drawCard = useCallback(
    (canvas: HTMLCanvasElement, animTime: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const p = SNAP_PALETTES[vibe];

      ctx.clearRect(0, 0, W, H);

      // Base fill
      ctx.fillStyle = p.d;
      ctx.fillRect(0, 0, W, H);

      // Top-left animated blob
      const bx1 = W * 0.15 + Math.sin(animTime * 0.4) * W * 0.04;
      const by1 = H * 0.12 + Math.cos(animTime * 0.3) * H * 0.02;
      const g1 = ctx.createRadialGradient(bx1, by1, 0, bx1, by1, W * 0.75);
      g1.addColorStop(0, p.a);
      g1.addColorStop(1, p.d);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // Bottom-right animated blob
      const bx2 = W * 0.82 + Math.sin(animTime * 0.5 + 1.2) * W * 0.04;
      const by2 = H * 0.82 + Math.cos(animTime * 0.4 + 1.2) * H * 0.02;
      const g2 = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, W * 0.62);
      g2.addColorStop(0, p.b);
      g2.addColorStop(1, p.d);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      ctx.textAlign = "center";
      ctx.fillStyle = p.text;

      // "MONK RADIO" heading
      ctx.font = `bold ${Math.round(W * 0.048)}px Nunito, system-ui, sans-serif`;
      ctx.globalAlpha = 0.45;
      ctx.fillText("MONK RADIO", W / 2, H * 0.075);
      ctx.globalAlpha = 1;

      // Vibe badge
      const vibeName = `${VIBE_ICONS[vibe]}  ${vibe.toUpperCase()} VIBE`;
      ctx.font = `600 ${Math.round(W * 0.042)}px Nunito, system-ui, sans-serif`;
      ctx.globalAlpha = 0.65;
      ctx.fillText(vibeName, W / 2, H * 0.13);
      ctx.globalAlpha = 1;

      // Top divider
      ctx.strokeStyle = p.text;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W * 0.12, H * 0.155);
      ctx.lineTo(W * 0.88, H * 0.155);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Main lyric — big serif, centered
      const lyricText = currentLyric || (song?.title ? `♪ ${song.title}` : "♪");
      ctx.font = `bold ${Math.round(W * 0.092)}px Georgia, serif`;
      ctx.fillStyle = p.text;
      ctx.globalAlpha = 0.92;
      const lyricLines = wrapText(ctx, lyricText, W * 0.78);
      const lyricLineH = Math.round(W * 0.106);
      const lyricStartY = H * 0.5 - ((lyricLines.length - 1) * lyricLineH) / 2;
      lyricLines.slice(0, 4).forEach((line, i) => {
        ctx.fillText(line, W / 2, lyricStartY + i * lyricLineH);
      });
      ctx.globalAlpha = 1;

      // Song info
      if (song) {
        ctx.font = `${Math.round(W * 0.038)}px Nunito, system-ui, sans-serif`;
        ctx.globalAlpha = 0.55;
        ctx.fillText(`— ${song.title}  ·  ${song.artist}`, W / 2, H * 0.655);
        ctx.globalAlpha = 1;
      }

      // Mid divider
      ctx.strokeStyle = p.text;
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.moveTo(W * 0.2, H * 0.695);
      ctx.lineTo(W * 0.8, H * 0.695);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Buddha's last message
      if (lastBuddhaMessage) {
        const quote =
          lastBuddhaMessage.length > 130
            ? lastBuddhaMessage.slice(0, 127) + "…"
            : lastBuddhaMessage;
        ctx.font = `italic ${Math.round(W * 0.04)}px Georgia, serif`;
        ctx.fillStyle = p.text;
        ctx.globalAlpha = 0.72;
        const qLines = wrapText(ctx, `"${quote}"`, W * 0.73);
        const qLineH = Math.round(W * 0.052);
        const qStartY = H * 0.74;
        qLines.slice(0, 4).forEach((line, i) => {
          ctx.fillText(line, W / 2, qStartY + i * qLineH);
        });
        ctx.globalAlpha = 1;
      }

      // Bottom branding
      ctx.font = `${Math.round(W * 0.033)}px Nunito, system-ui, sans-serif`;
      ctx.globalAlpha = 0.35;
      ctx.fillText("monkradio.app", W / 2, H * 0.955);
      ctx.globalAlpha = 1;
    },
    [vibe, song, currentLyric, lastBuddhaMessage],
  );

  // Always animate the preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || recording) return;
    const start = Date.now();
    const tick = () => {
      drawCard(canvas, (Date.now() - start) / 1000);
      animRafRef.current = requestAnimationFrame(tick);
    };
    animRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRafRef.current);
  }, [drawCard, recording]);

  const downloadImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCard(canvas, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monk-vibe-${vibe}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }, [drawCard, vibe]);

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });
    } catch {
      // fallback without codec spec
      recorder = new MediaRecorder(stream);
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monk-vibe-${vibe}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setRecording(false);
      setRecordProgress(0);
      recorderRef.current = null;
    };

    recorder.start(100);
    recorderRef.current = recorder;
    setRecording(true);

    const DURATION = 15_000;
    const startT = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startT;
      const progress = Math.min(100, (elapsed / DURATION) * 100);
      setRecordProgress(progress);
      drawCard(canvas, elapsed / 1000);
      if (elapsed < DURATION) {
        recordRafRef.current = requestAnimationFrame(animate);
      } else {
        recorder.stop();
      }
    };
    recordRafRef.current = requestAnimationFrame(animate);
  }, [drawCard, vibe]);

  const stopRecording = useCallback(() => {
    cancelAnimationFrame(recordRafRef.current);
    recorderRef.current?.stop();
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[160] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" aria-hidden />

        <motion.div
          className="relative flex flex-col items-center gap-4 w-full max-w-xs"
          initial={{ scale: 0.88, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          style={{ fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif" }}
        >
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-stone-900/90 border border-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Card preview */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15"
            style={{ width: 270, height: 480 }}
          >
            <canvas
              ref={canvasRef}
              width={1080}
              height={1920}
              style={{ width: 270, height: 480, display: "block" }}
            />
          </div>

          {/* Recording progress */}
          {recording && (
            <div className="w-full">
              <div className="flex items-center justify-between text-[11px] text-white/60 mb-1.5">
                <span>Recording clip…</span>
                <span>{Math.round(recordProgress / 100 * 15)}s / 15s</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white/70"
                  style={{ width: `${recordProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={downloadImage}
              disabled={recording}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl",
                "text-sm font-semibold text-white transition-colors",
                "bg-white/15 hover:bg-white/22 border border-white/15",
                recording && "opacity-40 cursor-not-allowed",
              )}
            >
              <Download className="w-4 h-4" />
              Save Image
            </button>

            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 border border-red-400/30 transition-colors"
              >
                <Video className="w-4 h-4" />
                Record Clip
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white bg-white/15 hover:bg-white/22 border border-white/15 transition-colors"
              >
                <Square className="w-4 h-4" fill="currentColor" />
                Stop
              </button>
            )}
          </div>

          <p className="text-[10px] text-white/30 text-center leading-tight">
            9:16 format · perfect for Stories & TikTok
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
