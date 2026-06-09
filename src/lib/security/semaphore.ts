import "server-only";

/**
 * Promise-based counting semaphore. Used to cap concurrent outbound Climatiq
 * requests at 10 per worker instance, to stay within their per-second budget
 * even under traffic spikes.
 */
export class Semaphore {
  private permits: number;
  private waiters: Array<() => void> = [];

  constructor(public readonly max: number) {
    this.permits = max;
  }

  async acquire(): Promise<() => void> {
    if (this.permits > 0) {
      this.permits -= 1;
      return () => this.release();
    }
    return new Promise<() => void>((resolve) => {
      this.waiters.push(() => {
        this.permits -= 1;
        resolve(() => this.release());
      });
    });
  }

  private release() {
    this.permits += 1;
    const next = this.waiters.shift();
    if (next) next();
  }

  get available() {
    return this.permits;
  }
}

// Module-singleton semaphore for the Climatiq outbound channel.
export const climatiqSemaphore = new Semaphore(10);
