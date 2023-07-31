import { STORAGE_KEY_INDICES, StorageKey, WordMap } from '../constant'

export async function getAllKnownSync() {
  const record = (await chrome.storage.sync.get(STORAGE_KEY_INDICES)) as Record<string, string[]>
  const wordEntries = Object.values(record)
    .flat()
    .map(word => [word, 0])

  return Object.fromEntries(wordEntries) as WordMap
}

export async function syncKnowns(words: string[], localKnowns: WordMap) {
  const toSyncKnowns = {} as Record<string, string[]>

  const localKnownsGroupByKeys = {} as Record<string, string[]>
  for (const word in localKnowns) {
    for (const k of STORAGE_KEY_INDICES) {
      if (word.startsWith(k)) {
        localKnownsGroupByKeys[k] = localKnownsGroupByKeys[k] ?? []
        localKnownsGroupByKeys[k].push(word)
        break
      }
    }
  }

  for (const word of words) {
    for (const key of STORAGE_KEY_INDICES) {
      if (word.startsWith(key)) {
        toSyncKnowns[key] = toSyncKnowns[key] ?? localKnownsGroupByKeys[key] ?? []

        if (!toSyncKnowns[key].includes(word)) {
          toSyncKnowns[key].push(word)
          localKnowns[word] = 0
        }
        break
      }
    }
  }
  await chrome.storage.sync.set(toSyncKnowns)
  console.log('words synced: ', words.length)
}

export async function getSyncedOfKeys(keys: StorageKey[]) {
  const syncedValues = await chrome.storage.sync.get(keys)
  for (const key of keys) {
    if (!syncedValues[key]) {
      syncedValues[key] = await chrome.storage.local.get(key)
    }
  }
  return syncedValues
}

export async function syncByKeys(keys: StorageKey[]) {
  const localValues = await chrome.storage.local.get(keys)
  await chrome.storage.sync.set(localValues)
}
