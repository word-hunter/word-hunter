import { createSignal } from 'solid-js'
import { getStorageValues, uploadStorageValues } from './storage'
import { StorageKey, LevelKey, WordMap } from '../constant'

const DEFAULT_DICTS = {
  collins: true,
  longman: true,
  google: false,
  openai: false
}

export type DictName = keyof typeof DEFAULT_DICTS

export const DEFAULT_SETTINGS = {
  colors: ['#9FB0EF', '#C175D8'],
  blacklist: [] as string[],
  dictTabs: DEFAULT_DICTS,
  dictOrder: Object.keys(DEFAULT_DICTS) as DictName[],
  atuoPronounce: false,
  autoPauseYoutubeVideo: false,
  levels: ['4', '6', 'g', 'o'] as LevelKey[],
  openai: {
    apiKey: '',
    model: 'text-davinci-003'
  }
}

type SettingType = typeof DEFAULT_SETTINGS

export const [settings, setSettings] = createSignal({ ...DEFAULT_SETTINGS })

export async function setSetting<T extends keyof SettingType>(key: T, value: SettingType[T]) {
  setSettings({ ...settings(), [key]: value })
  await chrome.storage.local.set({ settings: settings() })
  await uploadStorageValues([StorageKey.settings])
}

export async function resotreSettings(values: SettingType) {
  await chrome.storage.local.set({ settings: values ?? DEFAULT_SETTINGS })
  await uploadStorageValues([StorageKey.settings])
  await setSettings(values ?? DEFAULT_SETTINGS)
}

export async function mergeSettings() {
  const localSetting = await chrome.storage.local.get(StorageKey.settings)
  const syncSetting = await chrome.storage.sync.get(StorageKey.settings)

  let mergedSettings: SettingType = { ...DEFAULT_SETTINGS }

  if (
    localSetting[StorageKey.settings] &&
    JSON.stringify(localSetting[StorageKey.settings]) !== JSON.stringify(mergedSettings)
  ) {
    for (const key in localSetting[StorageKey.settings]) {
      if (localSetting[StorageKey.settings][key]) {
        ;(mergedSettings as any)[key] = localSetting[StorageKey.settings][key]
      }
    }
  }
  if (
    syncSetting[StorageKey.settings] &&
    JSON.stringify(syncSetting[StorageKey.settings]) !== JSON.stringify(mergedSettings)
  ) {
    for (const key in syncSetting[StorageKey.settings]) {
      if (syncSetting[StorageKey.settings][key]) {
        ;(mergedSettings as any)[key] = syncSetting[StorageKey.settings][key]
      }
    }
  }
  await chrome.storage.local.set({ settings: mergedSettings })
  await uploadStorageValues([StorageKey.settings])
  await setSettings(mergedSettings)
}

function mergeObjectDeep(target: Record<string, any>, source: Record<string, any>) {
  for (const key in source) {
    if (!target.hasOwnProperty(key)) {
      target[key] = source[key]
    } else {
      if (typeof source[key] === 'object') {
        mergeObjectDeep(target[key], source[key])
      }
    }
  }
}

export async function getSelectedDicts(dict: WordMap) {
  await mergeSettings()
  const levels = settings().levels
  const newDict: WordMap = {}
  for (const word in dict) {
    const level = dict[word] ?? 'o'
    if (levels.includes(level)) {
      newDict[word] = level
    }
  }
  return newDict
}

export function initSettings() {
  getStorageValues([StorageKey.settings]).then(result => {
    mergeObjectDeep(result[StorageKey.settings], DEFAULT_SETTINGS)
    setSettings(result[StorageKey.settings] ?? DEFAULT_SETTINGS)
    mergeSettings()
  })

  // update context script after settings changed
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
    if (namespace === 'local' && changes[StorageKey.settings]) {
      const { oldValue, newValue } = changes[StorageKey.settings]
      setSettings(newValue)
      if (JSON.stringify(oldValue?.levels) !== JSON.stringify(newValue?.levels)) {
        window.__updateDicts?.()
      }
    }
  }
  if (typeof window !== 'undefined') {
    chrome.storage.onChanged.addListener(listener)
    window.addEventListener('beforeunload', () => {
      chrome.storage.onChanged.removeListener(listener)
    })
  }
}

initSettings()
