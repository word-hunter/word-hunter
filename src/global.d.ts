/// <reference types="vite/client" />

declare const __APP_VERSION__: string

declare interface Window {
  __toggleZenMode: () => void
  __updateAppIcon: () => void
  __getPageStatistics: () => readonly [number, number]
}
