import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../utils/cn";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "fade";
  as?: "div" | "section" | "article" | "li" | "h1" | "h2" | "h3" | "p" | "span";
};

export function Reveal({ children, className, delay = 0, variant = "up", as: Tag = "div" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.transitionDelay = `${delay}ms`;
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    // @ts-expect-error – dynamic tag
    <Tag ref={ref} className={cn(variant === "fade" ? "reveal-fade" : "reveal", className)}>
      {children}
    </Tag>
  );
}
