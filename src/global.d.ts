/// <reference types="vite/client" />

declare const __APP_VERSION__: string

declare interface Window {
  __markAsAllKnown: () => void
  __setColorStyle: () => void
  __toggleZenMode: () => void
  __toggleBlackList: () => void
  __getPageStatistics: () => readonly [number, number]
}
