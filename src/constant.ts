export const Levels = [
  ['p', 'Primary School'],
  ['m', 'Middle School'],
  ['h', 'High School'],
  ['4', 'CET-4'],
  ['6', 'CET-6'],
  ['g', 'GRE 8000'],
  ['o', '∞']
] as const

export type LevelKey = typeof Levels[number][0]

export type WordInfo = {
  o: string
  l: LevelKey
  t: string
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
  mark: '__mark',
  mark_parent: '__mark_parent',
  known: '__word_known',
  unknown: '__word_unknown',
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
  'latest_sync_time' = 'latest_sync_time'
}

export enum Messages {
  'set_known' = 'set_known',
  'set_all_known' = 'set_all_known',
  'add_context' = 'add_context',
  'delete_context' = 'delete_context',
  'app_available' = 'app_available',
  'play_audio' = 'play_audio',
  'open_youglish' = 'open_youglish',
  'fetch_html' = 'fetch_html',
  'ai_explain' = 'ai_explain'
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

export const keepTextNodeHosts = ['reader.ttsu.app']

/**
 * group storage.sync items by word prefix, to avoid hitting the 512 items and 8kb limit per item.
 */
export const STORAGE_KEY_INDICES =
  'prot prop pres inte disc cont cons conc uns unr uni unf und unc una tri tra sup sub str sto ste sta spi spe sho sha scr sch sca sal ret res rep ref red rec rea pro pri pre pol per pen par mon mis min met mar man int ins inf ind inc imp hea har gra for ext exp dis des dep dem def dec cra cou cor con com col chi che cha cat car can cal bra bar bac ant zy zw zu zo zl zi ze za yu yt yo yl yi ye ya xy xm xe xa wy wu wr wo wi wh we wa vy vu vr vo vi ve va ux uv ut us ur up un um ul uk ui ug ud ub ua tz ty tw tu ts tr to ti th te tc ta sy sw sv su st sq sp so sn sm sl sk si sh sg sf se sc sa ry ru ro ri rh re ra qu qo qi qa py pu pt ps pr po pn pl pi ph pf pe pa oz oy ox ow ov ou ot os or op oo on om ol ok oj oi oh og of oe od oc ob oa ny nu nt no ni ng ne na my mu mo mn mi mf me ma ly lw lu lo ll li le la ky kw kv ku kr ko kn kl ki kh ke ka jy ju jo ji je ja iz ix iv it is ir ip io in im il ik ij ig if id ic ib ia hy hu hr ho hi he ha gy gu gr go gn gl gi gh ge ga fu fr fo fl fj fi fe fa ey ex ew ev eu et es er eq ep eo en em el ek ej ei eg ef ee ed ec eb ea dz dy dw du dr do dj di dh de da cz cy cu ct cr co cn cl ci ch ce ca by bu br bo bl bi bh be bd ba az ay ax aw av au at as ar aq ap ao an am al ak aj ai ah ag af ae ad ac ab aa a'.split(
    ' '
  )
