import { createSignal } from 'solid-js'
import { getStorageValues, uploadStorageValues } from './storage'
import { StorageKey } from '../constant'

export const DEFAULT_SETTINGS = {
  colors: ['#9FB0EF', '#C175D8'],
  blacklist: [] as string[],
  dictTabs: {
    collins: true,
    google: false,
    openai: false
  },
  maxHighlight: 1000,
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
  await setSettings(DEFAULT_SETTINGS)
}

export async function mergeSettings() {
  const localSetting = await chrome.storage.local.get(StorageKey.settings)
  const syncSetting = await chrome.storage.sync.get(StorageKey.settings)
  console.log(localSetting, syncSetting)
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...(localSetting[StorageKey.settings] ?? {})
  }
  if (syncSetting[StorageKey.settings]) {
    for (const key in syncSetting[StorageKey.settings]) {
      if (syncSetting[StorageKey.settings][key]) {
        mergedSettings[key] = syncSetting[StorageKey.settings][key]
      }
    }
  }
  await chrome.storage.local.set({ settings: mergedSettings })
  await uploadStorageValues([StorageKey.settings])
  await setSettings(mergedSettings)
}

function initSettings() {
  getStorageValues([StorageKey.settings]).then(result => {
    setSettings(result[StorageKey.settings] ?? DEFAULT_SETTINGS)
  })

  // update context script after settings changed
  if (typeof window !== 'undefined') {
    chrome.storage.onChanged.addListener(async (changeds, namespace) => {
      if (namespace === 'local' && changeds[StorageKey.settings]) {
        setSettings(changeds[StorageKey.settings].newValue)
      }
    })
  }
}

initSettings()
