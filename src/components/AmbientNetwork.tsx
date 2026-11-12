import { useEffect, useRef } from "react";
import { BRAND_SPARKS, motionAllowed, type DealDirection } from "../motion.ts";

interface AmbientNetworkProps {
  /** Changes on every deal; each change (re)starts one slow, finite drift. */
  dealKey: string;
  direction: DealDirection;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
}

const ACTIVE_MS = 15000; // how long the network drifts after a deal
const FADE_IN_MS = 1800;
const FADE_OUT_MS = 4500;
const LINK_PX = 140;

/**
 * Ambient network (decision 70, replaces the edge wake of decision 69): a slow,
 * discreet brand-coloured particle network across the whole app background,
 * after the hero of the Autonom "Prima sesiune deschisă AI" page. Each deal
 * fades it in, lets it drift for ~15 s and fades it out; it then stops
 * completely (no loop between deals). Drawn behind all content, so the opaque
 * card keeps the question clear. Off under prefers-reduced-motion.
 */
export function AmbientNetwork({ dealKey, direction }: AmbientNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef<{
    particles: Particle[];
    w: number;
    h: number;
    dark: boolean;
    raf: number;
    start: number;
    until: number;
    alpha: number;
  } | null>(null);

  // Particles live across deals so the field never jumps; they are rebuilt on resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !motionAllowed()) return;
    const ctx = canvas.getContext?.("2d");
    if (!ctx) return;

    const build = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
      const colours = [...BRAND_SPARKS, dark ? "#ffffff" : "#10069F"];
      const count = Math.round(Math.min(70, Math.max(16, (w * h) / 20000)));
      const prev = state.current;
      state.current = {
        particles: Array.from({ length: count }, (_, i) => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.24,
          vy: (Math.random() - 0.5) * 0.24,
          r: 1.3 + Math.random() * 2,
          c: colours[i % colours.length] ?? "#147BD1",
        })),
        w,
        h,
        dark,
        raf: prev?.raf ?? 0,
        start: prev?.start ?? 0,
        until: prev?.until ?? 0,
        alpha: prev?.alpha ?? 0,
      };
    };
    build();
    window.addEventListener("resize", build);
    return () => {
      window.removeEventListener("resize", build);
      if (state.current) cancelAnimationFrame(state.current.raf);
      state.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const s = state.current;
    if (!canvas || !s || !motionAllowed()) return;
    const ctx = canvas.getContext?.("2d");
    if (!ctx) return;

    // A gentle nudge in the direction of travel, then the drift carries on.
    const push = direction === "prev" ? 0.18 : -0.18;
    for (const p of s.particles) p.vx += push * (0.5 + Math.random() * 0.5);

    const now = performance.now();
    const running = s.until > now;
    s.until = now + ACTIVE_MS;
    if (!running) s.start = now;
    if (running) return; // the loop already in flight picks up the new end time

    const tick = (t: number) => {
      const cur = state.current;
      if (!cur) return;
      const fadeIn = Math.min(1, (t - cur.start) / FADE_IN_MS);
      const fadeOut = Math.min(1, Math.max(0, (cur.until - t) / FADE_OUT_MS));
      cur.alpha = Math.min(fadeIn, fadeOut);
      ctx.clearRect(0, 0, cur.w, cur.h);
      if (t >= cur.until || document.visibilityState === "hidden") {
        cur.alpha = 0;
        cur.until = 0;
        return;
      }
      for (const p of cur.particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Ease any nudge back to a slow cruise, and wrap around the edges.
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 0.16) {
          p.vx *= 0.992;
          p.vy *= 0.992;
        }
        if (p.x < -20) p.x = cur.w + 20;
        else if (p.x > cur.w + 20) p.x = -20;
        if (p.y < -20) p.y = cur.h + 20;
        else if (p.y > cur.h + 20) p.y = -20;
      }
      const line = cur.dark ? "255,255,255" : "16,6,159";
      const lineMax = cur.dark ? 0.16 : 0.12;
      ctx.lineWidth = 1;
      cur.particles.forEach((a, i) => {
        for (const b of cur.particles.slice(i + 1)) {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_PX) {
            ctx.strokeStyle = `rgba(${line},${(lineMax * (1 - d / LINK_PX) * cur.alpha).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      });
      ctx.globalAlpha = (cur.dark ? 0.7 : 0.55) * cur.alpha;
      for (const p of cur.particles) {
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      cur.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  }, [dealKey, direction]);

  return <canvas ref={canvasRef} className="ambient-network" aria-hidden="true" />;
}
