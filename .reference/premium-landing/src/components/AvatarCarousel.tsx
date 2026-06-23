import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "../utils/cn";

export type Artist = {
  id: string;
  name: string;
  image: string;
};

type Props = {
  items: Artist[];
  className?: string;
  auto?: boolean;
};

/**
 * Avatar carousel — circular artist images.
 * Center avatar is large with a violet glow ring; sides peek smaller and faded.
 * Includes drag + arrow controls. Tap a side avatar to focus it.
 */
export function AvatarCarousel({ items, className, auto = true }: Props) {
  const [index, setIndex] = useState(Math.floor(items.length / 2));
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);

  const total = items.length;

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      if (!isPaused.current) setIndex((i) => (i + 1) % total);
    }, 4200);
    return () => clearInterval(id);
  }, [auto, total]);

  useEffect(() => {
    const el = stageRef.current;
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

  const go = (dir: -1 | 1) => setIndex((i) => (i + dir + total) % total);

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
    if (dragX > 50) go(-1);
    else if (dragX < -50) go(1);
    setDragX(0);
    startX.current = null;
    isPaused.current = false;
  };

  const getOffset = (i: number) => {
    let d = i - index;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };

  const current = items[index];

  return (
    <div className={cn("relative w-full", className)}>
      {/* Stage */}
      <div
        ref={stageRef}
        className="relative mx-auto flex h-[260px] w-full items-center justify-center select-none sm:h-[300px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Soft violet glow behind center */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(167,139,250,0.45) 0%, rgba(139,92,246,0.25) 35%, transparent 70%)",
          }}
        />

        {items.map((it, i) => {
          const off = getOffset(i);
          const abs = Math.abs(off);
          if (abs > 3) return null;

          const dragInf = dragX / 200;
          const pos = off - dragInf;
          const abp = Math.abs(pos);

          const xPx = pos * 110;
          const scale = pos === 0 ? 1 : Math.max(0.45, 1 - abp * 0.28);
          const opacity = abp > 2.6 ? 0 : 1 - Math.min(abp, 1) * 0.45;
          const blur = abp > 0.3 ? Math.min(abp * 1.4, 3) : 0;
          const z = 100 - Math.round(abp * 10);

          const isCenter = off === 0;

          return (
            <button
              key={it.id}
              type="button"
              onClick={() => off !== 0 && setIndex(i)}
              aria-label={it.name}
              className="absolute left-1/2 top-1/2 origin-center focus:outline-none"
              style={{
                transform: `translate(-50%, -50%) translateX(${xPx}px) scale(${scale})`,
                opacity,
                filter: blur > 0 ? `blur(${blur}px) saturate(0.9)` : "none",
                zIndex: z,
                transition:
                  startX.current === null
                    ? "transform 700ms cubic-bezier(0.25,1,0.5,1), opacity 700ms ease, filter 700ms ease"
                    : "none",
                pointerEvents: abp > 2 ? "none" : "auto",
              }}
            >
              <div className="relative">
                {/* Glow ring on center */}
                {isCenter && (
                  <>
                    <span
                      className="pointer-events-none absolute inset-0 rounded-full opacity-70 blur-md"
                      style={{
                        background:
                          "conic-gradient(from 120deg, #a78bfa, #ec4899, #8b5cf6, #a78bfa)",
                      }}
                    />
                    <span className="pointer-events-none absolute -inset-3 rounded-full border border-white/20" />
                  </>
                )}
                <div
                  className={cn(
                    "relative overflow-hidden rounded-full ring-1 ring-white/10",
                    isCenter ? "h-36 w-36 sm:h-44 sm:w-44" : "h-20 w-20 sm:h-24 sm:w-24"
                  )}
                >
                  <img
                    src={it.image}
                    alt={it.name}
                    className="h-full w-full object-cover"
                    draggable={false}
                    loading="lazy"
                  />
                </div>
                {/* Name label under avatar */}
                {abs <= 2 && (
                  <div
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-medium transition-all duration-500",
                      isCenter
                        ? "top-full mt-4 text-[22px] text-white"
                        : "top-full mt-2 text-[12px] text-white/55"
                    )}
                  >
                    {it.name}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {/* Floating segmented control with arrow (top-right of stage like the screenshot) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 sm:right-4">
          <div className="flex items-center gap-0 rounded-full border border-white/15 bg-black/40 p-1 backdrop-blur-md">
            <button
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Próximo"
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SR-only current artist */}
      <span className="sr-only" aria-live="polite">{current?.name}</span>
    </div>
  );
}
