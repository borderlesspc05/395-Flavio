import { type CSSProperties, type ElementType, type ReactNode } from 'react';
import { useScrollReveal, scrollRevealClass } from '../hooks/useScrollReveal';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
  variant?: 'up' | 'left' | 'right' | 'scale';
  /** When false, element hides again when leaving the viewport (bidirectional scroll). */
  once?: boolean;
}

export function ScrollReveal({
  children,
  className = '',
  as: Tag = 'div',
  delay = 0,
  variant = 'up',
  once = true,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ once });
  const style: CSSProperties | undefined = delay
    ? { ['--reveal-delay' as string]: `${delay}ms` }
    : undefined;

  return (
    <Tag
      ref={ref}
      className={`${scrollRevealClass(isVisible, `scroll-reveal scroll-reveal--${variant}`)} ${className}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}
