export type WordMap = Record<string, 0>

export type WordContext = {
  url: string
  title: string
  text: string
  word: string
  timestamp: number
  favicon?: string
}

export type ContextMap = Record<string, WordContext[]>

export const classes = {
  mark: '__mark',
  mark_parent: '__mark_parent',
  known: '__word_known',
  unknown: '__word_unknown',
  in_viewport: '__word_in_viewport',
  card: 'word_card',
  zen_mode: '__zen_mode',
  excluded: '__excluded'
}

export enum StorageKey {
  'known' = 'known',
  'context' = 'context',
  'blacklist' = 'blacklist',
  'maxHighlight' = 'maxHighlight'
}

export enum Messages {
  'set_known' = 'set_known',
  'set_all_known' = 'set_all_known',
  'add_context' = 'add_context',
  'delete_context' = 'delete_context',
  'app_available' = 'app_available',
  'play_audio' = 'play_audio',
  'open_youglish' = 'open_youglish',
  'fetch_html' = 'fetch_html'
}

export const invalidTags = [
  'SCRIPT',
  'STYLE',
  'BUTTON',
  'VIDEO',
  'SVG',
  'CODE',
  'NOSCRIPT',
  'NOFRAMES',
  'INPUT',
  'TEXTAREA',
  'ABBR',
  'AREA',
  'CODE',
  'PRE',
  'AUDIO',
  'VIDEO',
  'CANVAS',
  'HEAD',
  'MAP',
  'META',
  'OBJECT'
]

export const invalidSelectors = ['.monaco-editor', '.CodeMirror-code', '#video-title']

export const wordReplaceRegex = /(\b|\s)([a-z]+)(\s|,|\.|\b)/gi
export const wordRegex = /^[a-z]+$/i

export const defaultColors = ['#9FB0EF', '#C175D8']
export const defaultMaxHighlight = 1000

export const keepTextNodeHosts = ['reader.ttsu.app']
