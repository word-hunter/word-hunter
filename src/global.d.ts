/// <reference types="vite/client" />

declare const __APP_VERSION__: string

declare interface Window extends WindowOrWorkerGlobalScope {
  __toggleZenMode: () => void
  __updateAppIcon: () => void
  __updateDicts: () => void
  __getPageStatistics: () => readonly [number, number, number]
}

// Types for the AIModelAvailability enum
type AIModelAvailability = 'readily' | 'after-download' | 'no'

// Dictionary for AITextSessionOptions
interface AITextSessionOptions {
  topK?: number // EnforceRange is not directly applicable in TypeScript
  temperature?: number
}

// Interface for AITextSession
interface AITextSession {
  prompt(input: string): Promise<string>
  promptStreaming(input: string): Promise<AsyncIterable<string>>
  destroy(): void
  clone(): AITextSession // Not yet implemented
}

// Interface for AI
interface AI {
  canCreateTextSession(): Promise<AIModelAvailability>
  createTextSession(options?: AITextSessionOptions): Promise<AITextSession>
  defaultTextSessionOptions(): Promise<AITextSessionOptions>
}

// Extending the WindowOrWorkerGlobalScope to include the 'ai' attribute
interface WindowOrWorkerGlobalScope {
  readonly ai: AI
}

// Extending Window and WorkerGlobalScope to implement WindowOrWorkerGlobalScope
interface WorkerGlobalScope extends WindowOrWorkerGlobalScope {}
