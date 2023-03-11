export interface Adapter {
  readonly name: string
  readonly host: string
  readonly apiBase: string
  readonly sectionSelector: string

  get style(): string
  lookup(context: { word: string; text?: string }): Promise<string>
  getPageUrl: (word: string) => string
  getWordByHref(href: string): string
  cspViolationHandler?: (e: SecurityPolicyViolationEvent, root: HTMLElement) => void
  bindRootClickEvent?: (root: HTMLElement) => void
  unbindRootClickEvent?: () => void
}
