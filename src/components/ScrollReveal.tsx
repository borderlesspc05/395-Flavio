import { type CSSProperties, type ElementType, type ReactNode } from 'react';
import { useScrollReveal, scrollRevealClass } from '../hooks/useScrollReveal';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
  variant?: 'up' | 'left' | 'right' | 'scale';
}

export function ScrollReveal({
  children,
  className = '',
  as: Tag = 'div',
  delay = 0,
  variant = 'up',
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();
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
