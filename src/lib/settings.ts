import { createSignal } from 'solid-js'
import { getLocalValue, getSyncValue } from './storage'
import { StorageKey, LevelKey, WordInfoMap } from '../constant'

const DEFAULT_DICTS = {
  collins: true,
  longman: true,
  google: false,
  openai: false
}

export type DictName = keyof typeof DEFAULT_DICTS
export type MouseKey = 'NONE' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'

export const MarkStyles = [
  'background',
  'text',
  'outline',
  'underline',
  'double-underline',
  'wavy',
  'dotted',
  'dashed',
  'emphasis-dot',
  'emphasis-circle',
  'emphasis-open-circle',
  'emphasis-triangle',
  'shape',
  'slanting',
  'pen'
] as const

export const DEFAULT_SETTINGS = {
  colors: ['#9FB0EF', '#C175D8'],
  markStyle: 'background' as typeof MarkStyles[number],
  blacklist: [] as string[],
  dictTabs: DEFAULT_DICTS,
  dictOrder: Object.keys(DEFAULT_DICTS) as DictName[],
  showCnTrans: false,
  atuoPronounce: false,
  mosueKey: 'NONE' as MouseKey,
  volume: 95,
  autoPauseYoutubeVideo: false,
  levels: ['4', '6', 'g', 'o'] as LevelKey[],
  openai: {
    apiKey: '',
    model: 'gpt-3.5-turbo-instruct'
  },
  update_timestamp: 1
}

export type SettingType = typeof DEFAULT_SETTINGS

export const [settings, setSettings] = createSignal({ ...DEFAULT_SETTINGS })

export async function setSetting<T extends keyof SettingType>(key: T, value: SettingType[T]) {
  setSettings({ ...settings(), [key]: value, update_timestamp: Date.now() })
  await chrome.storage.local.set({ settings: settings() })
  await syncSettings(settings())
}

export async function syncSettings(settings: SettingType) {
  try {
    await chrome.storage.sync.set({ [StorageKey.settings]: settings })
  } catch (e) {
    console.log(e)
  }
}

export async function resotreSettings(values: SettingType) {
  values = values ?? DEFAULT_SETTINGS
  values.update_timestamp = Date.now()
  await chrome.storage.local.set({ settings: values })
  await syncSettings(values)
  await setSettings(values)
}

export async function mergeSettings() {
  const localSetting = await getLocalValue(StorageKey.settings)
  const syncSetting = await getSyncValue(StorageKey.settings)

  if (localSetting.update_timestamp === syncSetting.update_timestamp) {
    return
  }

  let mergedSettings: SettingType = mergeSettingInOrder([localSetting, syncSetting])
  await chrome.storage.local.set({ settings: mergedSettings })
  await syncSettings(mergedSettings)
  await setSettings(mergedSettings)
}

export function mergeSettingInOrder(settingsList: SettingType[]) {
  let mergedSettings: SettingType = { ...DEFAULT_SETTINGS }
  const settingsListInOrder = settingsList.sort((a, b) => (a.update_timestamp ?? 0) - (b.update_timestamp ?? 0))
  settingsListInOrder.forEach(_settings => {
    Object.assign(mergedSettings, fillUpNewSettingFiled(_settings, DEFAULT_SETTINGS))
  })
  // update timestamp
  mergedSettings.update_timestamp = Date.now()
  return mergedSettings
}

// fill up new setting field deeply
function fillUpNewSettingFiled(target: Record<string, any>, source: Record<string, any>) {
  for (const key in source) {
    if (!target.hasOwnProperty(key)) {
      target[key] = source[key]
    } else {
      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        fillUpNewSettingFiled(target[key], source[key])
      }
    }
  }
  return target
}

export async function getSelectedDicts(dict: WordInfoMap) {
  await mergeSettings()
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
  getLocalValue(StorageKey.settings).then(localSettings => {
    setSettings(localSettings ?? DEFAULT_SETTINGS)
    mergeSettings()
  })

  // update context script after settings changed
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
    if (namespace === 'local' && changes[StorageKey.settings]) {
      const { oldValue, newValue } = changes[StorageKey.settings]
      setSettings(newValue)
      if (
        JSON.stringify(oldValue?.levels) !== JSON.stringify(newValue?.levels) ||
        oldValue?.showCnTrans !== newValue?.showCnTrans
      ) {
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
