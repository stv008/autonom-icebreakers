import { useEffect, useRef } from "react";
import { BRAND_SPARKS, motionAllowed, type DealDirection } from "../motion.ts";

interface DealWakeProps {
  /** Changes on every deal; each change plays one finite burst. */
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

const LIFETIME_MS = 2200;
const LINK_PX = 120;

/**
 * Network wake (decision 69), after the hero network of the Autonom
 * "Prima sesiune deschisă AI" page: on each deal, brand-coloured particles
 * leave the card's edges, link up when close and fade out within ~2 s.
 * Drawn on a canvas *behind* the opaque card, so nothing ever moves behind
 * the question. Finite by design: no loop runs between deals.
 */
export function DealWake({ dealKey, direction }: DealWakeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !motionAllowed()) return;
    const ctx = canvas.getContext?.("2d");
    const card = canvas.parentElement?.querySelector<HTMLElement>(".card");
    if (!ctx || !card) return;

    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const r = card.getBoundingClientRect();
    const left = r.left - box.left;
    const top = r.top - box.top;
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const colours = [...BRAND_SPARKS, dark ? "#ffffff" : "#10069F"];
    const line = dark ? "255,255,255" : "16,6,159";
    // Trail opposite to the card's travel: a "next" card arrives from the right.
    const trail = direction === "prev" ? 1 : -1;

    const count = Math.round(Math.min(56, Math.max(18, (box.width * box.height) / 16000)));
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const edge = i % 4; // spread over the four edges, weighted to the trailing side
      const t = Math.random();
      let x: number;
      let y: number;
      if (edge === 0 || edge === 1) {
        x = trail < 0 ? left : left + r.width;
        y = top + t * r.height;
      } else if (edge === 2) {
        x = left + t * r.width;
        y = top;
      } else {
        x = left + t * r.width;
        y = top + r.height;
      }
      const speed = 1.4 + Math.random() * 2.6;
      return {
        x,
        y,
        vx: (edge < 2 ? trail : trail * 0.5 + (Math.random() - 0.5)) * speed,
        vy: (edge === 2 ? -1 : edge === 3 ? 1 : Math.random() - 0.5) * speed * 0.7,
        r: 1.6 + Math.random() * 2.6,
        c: colours[i % colours.length] ?? "#147BD1",
      };
    });

    let raf = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const k = (now - t0) / LIFETIME_MS;
      ctx.clearRect(0, 0, box.width, box.height);
      if (k >= 1 || document.visibilityState === "hidden") return;
      const fade = 1 - k * k;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.975;
        p.vy *= 0.975;
      }
      ctx.lineWidth = 1;
      particles.forEach((a, i) => {
        for (const b of particles.slice(i + 1)) {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_PX) {
            ctx.strokeStyle = `rgba(${line},${(0.3 * (1 - d / LINK_PX) * fade).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      });
      ctx.globalAlpha = 0.85 * fade;
      for (const p of particles) {
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, box.width, box.height);
    };
  }, [dealKey, direction]);

  return <canvas ref={canvasRef} className="deal-wake" aria-hidden="true" />;
}
