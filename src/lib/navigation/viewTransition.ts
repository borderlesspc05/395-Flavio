import { flushSync } from 'react-dom';
import type { MouseEvent } from 'react';
import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom';

const USE_NATIVE_VIEW_TRANSITIONS = false;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isModifiedClick(event: MouseEvent<HTMLElement>): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

export function runViewTransition(update: () => void): void {
  if (
    !USE_NATIVE_VIEW_TRANSITIONS ||
    prefersReducedMotion() ||
    typeof document.startViewTransition !== 'function'
  ) {
    update();
    return;
  }

  let didUpdate = false;

  try {
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        didUpdate = true;
        update();
      });
    });

    transition.ready.catch(() => undefined);
    transition.updateCallbackDone.catch(() => undefined);
    transition.finished.catch(() => undefined);
  } catch {
    if (!didUpdate) update();
  }
}

export function navigateWithViewTransition(
  navigate: NavigateFunction,
  to: To,
  options?: NavigateOptions
): void {
  runViewTransition(() => {
    navigate(to, options);
  });
}
