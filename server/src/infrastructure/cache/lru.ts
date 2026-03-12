type LruEntry<V> = {
  value: V
  expiresAt: number
}

export class LruTtlCache<V> {
  private readonly store = new Map<string, LruEntry<V>>()

  constructor(private readonly maxEntries: number = 5000) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key)
    if (!entry) {
      return undefined
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return undefined
    }

    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  set(key: string, value: V, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs
    if (this.store.has(key)) {
      this.store.delete(key)
    }

    this.store.set(key, { value, expiresAt })
    this.evictExpired()
    this.evictOverflow()
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  entries(): Array<[string, V]> {
    this.evictExpired()
    return Array.from(this.store.entries()).map(([key, entry]) => [key, entry.value])
  }

  get size() {
    this.evictExpired()
    return this.store.size
  }

  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key)
      }
    }
  }

  private evictOverflow(): void {
    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value
      if (!oldestKey) {
        return
      }
      this.store.delete(oldestKey)
    }
  }
}
