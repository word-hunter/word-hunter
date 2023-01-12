export interface Adapter {
  readonly name: string
  readonly host: string
  readonly apiBase: string

  get style(): string
  lookup(word: string): Promise<string>
  getWordByHref(href: string): string
  cspViolationHandler?: (e: SecurityPolicyViolationEvent, root: HTMLElement) => void
}
