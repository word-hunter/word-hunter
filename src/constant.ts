export type WordMap = {
  [key: string]: 0
}

export type WordContext = {
  url: string
  text: string
  word: string
  timestamp: number
  favicon?: string
}

export const classes = {
  mark: '__mark',
  mark_parent: '__mark_parent',
  known: '__word_known',
  unknown: '__word_unknown',
  card: 'word_card',
  zen_mode: '__zen_mode',
  excluded: '__excluded'
}

export enum WordType {
  'known' = 'known',
  'unknown' = 'unknown'
}

export enum Messages {
  'set_known' = 'set_known',
  'set_all_known' = 'set_all_known',
  'play_audio' = 'play_audio'
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
  'INTPU',
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

export const wordReplaceRegex = /(\b|\s)([a-z]+)(\s|,|\.|\b)/gi
export const wordRegex = /^[a-z]+$/i

export const defaultColors = ['#9FB0EF']

export const keepTextNodeHosts = ['reader.ttsu.app']
