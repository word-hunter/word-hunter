import { StorageKey } from '../constant'
import { createSignal } from 'solid-js'

const defaultDicts = { collins: true, google: false, openai: false }

export const [dictTabs, setDictTabs] = createSignal<typeof defaultDicts>(defaultDicts)

function readDictTabSettings() {
  chrome.storage.local.get(StorageKey.dictTabs, result => {
    const dictSettings = result[StorageKey.dictTabs] ?? defaultDicts
    setDictTabs(dictSettings)
  })
}

export function updateDictTabSettings(newDicts: typeof defaultDicts) {
  chrome.storage.local.set({ [StorageKey.dictTabs]: newDicts }, () => {
    setDictTabs(newDicts)
  })
}

readDictTabSettings()
