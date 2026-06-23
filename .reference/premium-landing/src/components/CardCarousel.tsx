import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../utils/cn";

export type CardItem = {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  tag?: string;
};

type Props = {
  items: CardItem[];
  className?: string;
  /** When true, auto-advances every 5s */
  auto?: boolean;
};

/**
 * Premium 3D-feel carousel.
 * Center card is fully visible & scaled; side cards peek smaller and faded.
 * Supports drag/swipe, arrow nav, and tap-to-focus a side card.
 */
export function CardCarousel({ items, className, auto = true }: Props) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);

  const total = items.length;

  // Auto-rotate
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      if (!isPaused.current) {
        setIndex((i) => (i + 1) % total);
      }
    }, 5200);
    return () => clearInterval(id);
  }, [auto, total]);

  // Pause on hover (desktop)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onEnter = () => (isPaused.current = true);
    const onLeave = () => (isPaused.current = false);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + total) % total);
  };

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    isPaused.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    setDragX(e.clientX - startX.current);
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    const threshold = 60;
    if (dragX > threshold) go(-1);
    else if (dragX < -threshold) go(1);
    setDragX(0);
    startX.current = null;
    isPaused.current = false;
  };

  // Compute card position in stack
  const getOffset = (i: number) => {
    let d = i - index;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };

  return (
    <div ref={containerRef} className={cn("relative w-full select-none", className)}>
      {/* Stage */}
      <div
        className="relative mx-auto flex h-[420px] w-full items-center justify-center sm:h-[480px]"
        style={{ perspective: "1400px" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {items.map((item, i) => {
          const off = getOffset(i);
          const abs = Math.abs(off);
          // Limit visible neighbors to ±2
          if (abs > 2) return null;

          const dragInfluence = dragX / 280; // -1..+1ish
          const pos = off - dragInfluence;
          const absPos = Math.abs(pos);

          // Geometry
          const xPercent = pos * 58; // horizontal distance
          const scale = Math.max(0.6, 1 - absPos * 0.18);
          const rotateY = pos * -18;
          const opacity = absPos > 1.6 ? 0 : 1 - Math.min(absPos, 1) * 0.55;
          const blur = absPos > 0.3 ? Math.min(absPos * 2.2, 4) : 0;
          const z = 100 - Math.round(absPos * 10);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => off !== 0 && setIndex(i)}
              className="absolute top-1/2 left-1/2 origin-center cursor-pointer focus:outline-none"
              style={{
                transform: `translate(-50%, -50%) translateX(${xPercent}%) scale(${scale}) rotateY(${rotateY}deg)`,
                opacity,
                filter: blur > 0 ? `blur(${blur}px) saturate(0.85)` : "none",
                zIndex: z,
                transition:
                  startX.current === null
                    ? "transform 700ms cubic-bezier(0.25, 1, 0.5, 1), opacity 700ms ease, filter 700ms ease"
                    : "none",
                transformStyle: "preserve-3d",
                pointerEvents: absPos > 1.4 ? "none" : "auto",
              }}
              aria-label={`${item.title}${off === 0 ? " (in focus)" : ""}`}
            >
              <article
                className={cn(
                  "relative h-[400px] w-[240px] overflow-hidden rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] sm:h-[460px] sm:w-[280px]",
                  off === 0 && "ring-1 ring-white/15"
                )}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/40" />

                {/* Text */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  {item.tag && (
                    <span className="mb-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur">
                      {item.tag}
                    </span>
                  )}
                  <h3 className="text-[22px] font-medium leading-tight text-white">{item.title}</h3>
                  {item.subtitle && (
                    <p className="mt-1 text-[13px] leading-snug text-white/70">{item.subtitle}</p>
                  )}
                </div>
              </article>
            </button>
          );
        })}
      </div>

      {/* Dots + arrows */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={() => go(-1)}
          aria-label="Anterior"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/90 transition-all hover:bg-white/[0.1] hover:scale-105"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Ir para slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === index ? "w-7 bg-[var(--color-brand)]" : "w-1.5 bg-white/20 hover:bg-white/40"
              )}
            />
          ))}
        </div>

        <button
          onClick={() => go(1)}
          aria-label="Próximo"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/90 transition-all hover:bg-white/[0.1] hover:scale-105"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
