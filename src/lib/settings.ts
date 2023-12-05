import { createSignal } from 'solid-js'
import { getSyncValue } from './storage'
import { StorageKey, LevelKey, WordInfoMap } from '../constant'
import { debounce } from '../lib/utils'
import { triggerGoogleDriveSyncJob } from './backup/sync'

const DEFAULT_DICTS = {
  collins: true,
  longman: true,
  google: false,
  haici: false,
  openai: false
}

export type DictName = keyof typeof DEFAULT_DICTS
export type MouseKey = 'NONE' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'

export const MarkStyles = [
  'background',
  'background-underline',
  'text',
  'underline',
  'double-underline',
  'wavy',
  'dotted',
  'dashed'
] as const

export const DEFAULT_SETTINGS = {
  colors: ['#9FB0EF', '#C175D8'],
  markStyle: 'background' as (typeof MarkStyles)[number],
  blacklist: [] as string[],
  dictTabs: DEFAULT_DICTS,
  dictOrder: Object.keys(DEFAULT_DICTS) as DictName[],
  showCnTrans: false,
  atuoPronounce: false,
  mosueKey: 'NONE' as MouseKey,
  mouseHideDelay: 500,
  volume: 95,
  autoPauseYoutubeVideo: false,
  levels: ['p', 'm', 'h', '4', '6', 'g', 'o'] as LevelKey[],
  openai: {
    apiKey: '',
    apiProxy: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    prompt: 'explain the word ${word} in the sentence "${context}" with grade 2 English words'
  }
}

export type SettingType = typeof DEFAULT_SETTINGS

const isSettingsEqual = (newSettings: SettingType, oldSettings: SettingType) =>
  JSON.stringify(newSettings) === JSON.stringify(oldSettings)

export const [settings, setSettings] = createSignal({ ...DEFAULT_SETTINGS }, { equals: isSettingsEqual })

// MAX_WRITE_OPERATIONS_PER_MINUTE: 120
const syncSettingsDebounce = debounce(() => {
  syncSettings()
  triggerGoogleDriveSyncJob()
}, 100)

export async function setSetting<T extends keyof SettingType>(key: T, value: SettingType[T]) {
  setSettings({ ...settings(), [key]: value })
  syncSettingsDebounce()
}

export async function syncSettings(updateTime?: number) {
  try {
    const oldSettings = await getSyncValue(StorageKey.settings)
    if (isSettingsEqual(settings(), oldSettings)) return
    await chrome.storage.sync.set({
      [StorageKey.settings]: settings(),
      [StorageKey.settings_update_timestamp]: updateTime ?? Date.now()
    })
  } catch (e) {
    console.error(e)
  }
}

export async function resotreSettings(values: SettingType) {
  values = values ?? DEFAULT_SETTINGS
  setSettings(values)
  await syncSettings()
}

export async function mergeSetting(
  syncedSettings: SettingType,
  gdriveSettings: SettingType,
  syncedSettingTime: number = 0,
  gdriveSettingTime: number = 0
) {
  let mergedSettings: SettingType = { ...DEFAULT_SETTINGS }
  const updateTime = Date.now()
  const settingsList =
    gdriveSettingTime > syncedSettingTime ? [syncedSettings, gdriveSettings] : [gdriveSettings, syncedSettings]

  settingsList.forEach(_settings => {
    Object.assign(mergedSettings, fillUpNewDefaultSettingFiled(_settings, DEFAULT_SETTINGS))
  })
  setSettings(mergedSettings)
  await syncSettings(updateTime)
  return [mergedSettings, updateTime] as const
}

// fill up new setting field deeply
function fillUpNewDefaultSettingFiled(target: Record<string, any>, source: Record<string, any>) {
  for (const key in source) {
    if (!target.hasOwnProperty(key)) {
      target[key] = source[key]
    } else {
      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        fillUpNewDefaultSettingFiled(target[key], source[key])
      }
      if (Array.isArray(source[key]) && key === 'dictOrder') {
        source[key].forEach((sk: string) => {
          if (!target[key].includes(sk)) {
            target[key].push(sk)
          }
        })
        target[key].forEach((tk: string) => {
          if (!source[key].includes(tk)) {
            target.splice(target.indexOf(tk), 1)
          }
        })
      }
    }
  }
  return target
}

export async function getSelectedDicts(dict: WordInfoMap) {
  const levels = settings().levels
  const newDict: WordInfoMap = {}
  for (const word in dict) {
    const level = dict[word].l ?? 'o'
    if (levels.includes(level)) {
      newDict[word] = dict[word]
    }
  }
  return newDict
}

export function initSettings() {
  getSyncValue(StorageKey.settings).then(syncedSettings => {
    syncedSettings = fillUpNewDefaultSettingFiled(syncedSettings ?? DEFAULT_SETTINGS, DEFAULT_SETTINGS)
    setSettings(syncedSettings)
  })

  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
    if (namespace === 'sync' && changes[StorageKey.settings]) {
      const { oldValue, newValue } = changes[StorageKey.settings]
      setSettings(newValue)

      // update context script after settings changed
      if (typeof window !== 'undefined' && location?.protocol != 'chrome-extension:') {
        if (
          JSON.stringify(oldValue?.levels) !== JSON.stringify(newValue?.levels) ||
          oldValue?.showCnTrans !== newValue?.showCnTrans
        ) {
          window.__updateDicts?.()
        }
      }
    }
  }

  chrome.storage.onChanged.addListener(listener)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      chrome.storage.onChanged.removeListener(listener)
    })
  }
}

initSettings()
