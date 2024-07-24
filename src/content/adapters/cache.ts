export class Cache {
  private cache: Map<string, string> = new Map()

  get(word: string): string | undefined {
    return this.cache.get(word)
  }

  set(word: string, data: string) {
    this.cache.set(word, data)
    if (this.cache.size > 50) {
      for (const key of [...this.cache.keys()].slice(0, 10)) {
        this.cache.delete(key)
      }
    }
  }
}
