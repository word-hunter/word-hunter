export const Levels = [
  ['p', 'Primary School'],
  ['m', 'Middle School'],
  ['h', 'High School'],
  ['4', 'CET-4'],
  ['6', 'CET-6'],
  ['g', 'GRE 8000'],
  ['o', '∞']
] as const

export type LevelKey = (typeof Levels)[number][0]

export type WordInfo = {
  o: string
  l: LevelKey
  t?: string
  i?: number
}
export type WordInfoMap = Record<string, WordInfo>

export type WordMap = Record<string, LevelKey>

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
  card: 'word_card',
  zen_mode: '__zen_mode',
  excluded: '__excluded'
}

export enum StorageKey {
  // local storage keys
  'dict' = 'dict',
  'context' = 'context',
  'context_update_timestamp' = 'context_update_timestamp',
  // sync storage keys
  'known' = 'known',
  'settings' = 'settings',
  'knwon_update_timestamp' = 'knwon_update_timestamp',
  'settings_update_timestamp' = 'settings_update_timestamp',
  'latest_sync_time' = 'latest_sync_time',
  'sync_failed_message' = 'sync_failed_message',
  'mobile_auth_token' = 'mobile_auth_token',
  'local_knowns_log' = 'local_knowns_log',
  'version' = 'version'
}

export enum Messages {
  'set_known' = 'set_known',
  'set_all_known' = 'set_all_known',
  'set_unknown' = 'set_unknown',
  'add_context' = 'add_context',
  'delete_context' = 'delete_context',
  'app_available' = 'app_available',
  'play_audio' = 'play_audio',
  'fetch_html' = 'fetch_html',
  'ai_explain' = 'ai_explain'
}

export const invalidTags = [
  'SCRIPT',
  'STYLE',
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
  'OBJECT',
  'WH-ROOT',
  'W-MARK-T'
]

export const wordRegex = /^[a-z]+$/i
// match Chinese characters but not in brackets
export const cnRegex = /[\u4E00-\u9FA5…]+(?![^(]*(\)|\）))/
