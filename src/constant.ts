export type Dict = {
  [key: string]: 0
}

export type WordContext = {
  url: string
  text: string
  word: string
  timestamp: number
  favicon?: string
}

export type WordMap = Dict

export type HalfKnownWordMap = {
  [key: string]: WordContext
}

export const classes = {
  mark: '__mark',
  known: '__word_known',
  unknown: '__word_unknown',
  half: '__word_half',
  card: '__word_card'
}

export enum WordType {
  'known' = 'known',
  'unknown' = 'unknown',
  'half' = 'half'
}

export enum Messages {
  'set_known' = 'set_known',
  'set_known_half' = 'set_known_half',
  'set_all_known' = 'set_all_known'
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
  'TEXTAREA',
  'ABBR',
  'AREA',
  'CODE',
  'AUDIO',
  'VIDEO',
  'CANVAS',
  'HEAD',
  'MAP',
  'META',
  'OBJECT'
]

export const wordReplaceRegex = /(\b|\s)([a-z]+)(\s|,|\.|\b)/gi
export const wordRegex = /^[a-z]+$/i
