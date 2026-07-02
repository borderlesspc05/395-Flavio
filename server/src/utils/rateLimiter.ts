type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

/**
 * Limite fixo por janela (in-memory). Adequado para proteger endpoints públicos
 * como recuperação de senha. Em múltiplas instâncias, cada nó tem seu próprio
 * contador — ainda reduz abuso na maioria dos cenários.
 */
export class RateLimiter {
  private readonly store = new Map<string, Bucket>();
  private sweepCounter = 0;

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {}

  consume(key: string): RateLimitResult {
    const now = Date.now();
    this.maybeSweep(now);

    let bucket = this.store.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.store.set(key, bucket);
    }

    if (bucket.count >= this.max) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        remaining: 0,
      };
    }

    bucket.count += 1;
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, this.max - bucket.count),
    };
  }

  private maybeSweep(now: number): void {
    this.sweepCounter += 1;
    if (this.sweepCounter % 50 !== 0) return;
    for (const [key, bucket] of this.store) {
      if (now >= bucket.resetAt) this.store.delete(key);
    }
  }
}
