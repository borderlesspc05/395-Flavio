/** Fila no cliente alinhada ao limite de requisições simultâneas do plano */

let concurrencyLimit: number | null = 1;
let activeCount = 0;
const waitQueue: Array<() => void> = [];

import {
  CONCURRENCY_LIMITED_PATHS,
  isConcurrencyLimitedPath,
} from '../constants/concurrencyPaths';

export { CONCURRENCY_LIMITED_PATHS, isConcurrencyLimitedPath };

export function setClientConcurrencyLimit(limit: number | null) {
  concurrencyLimit = limit;
}

export function getClientConcurrencyLimit(): number | null {
  return concurrencyLimit;
}

function acquire(): Promise<void> {
  if (concurrencyLimit === null) return Promise.resolve();
  if (activeCount < concurrencyLimit) {
    activeCount += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeCount += 1;
      resolve();
    });
  });
}

function release() {
  if (concurrencyLimit === null) return;
  activeCount = Math.max(0, activeCount - 1);
  const next = waitQueue.shift();
  if (next) next();
}

export async function acquireClientSlot(): Promise<void> {
  await acquire();
}

export function releaseClientSlot(): void {
  release();
}

export async function runWithClientConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

export function isConcurrencyLimitedUrl(url?: string): boolean {
  if (!url) return false;
  return isConcurrencyLimitedPath(url);
}
