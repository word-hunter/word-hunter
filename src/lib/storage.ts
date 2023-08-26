import { STORAGE_KEY_INDICES, StorageKey, WordMap } from '../constant'

export async function getAllKnownSync() {
  const record = (await chrome.storage.sync.get(STORAGE_KEY_INDICES)) as Record<string, string[]>
  const wordEntries = Object.values(record)
    .flat()
    .filter(w => !!w)
    .map(word => [word, 0])

  return Object.fromEntries(wordEntries) as WordMap
}

export async function syncUpKnowns(words: string[], localKnowns: WordMap) {
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
          localKnowns[word] = 'o'
        }
        break
      }
    }
  }
  await chrome.storage.sync.set(toSyncKnowns)
}

export async function mergeKnowns() {
  const allKnownSynced = await getAllKnownSync()
  const knownsLocal = await chrome.storage.local.get([StorageKey.known])
  if (Object.keys(knownsLocal).length !== Object.keys(allKnownSynced).length) {
    const knowns = { ...allKnownSynced, ...knownsLocal[StorageKey.known] }
    await chrome.storage.local.set({ [StorageKey.known]: knowns })
    syncUpKnowns(Object.keys(knowns), knowns)
  }
}

export async function getStorageValues(keys: StorageKey[]) {
  return await chrome.storage.local.get(keys)
}

export async function uploadStorageValues(keys: StorageKey[]) {
  const localValues = await chrome.storage.local.get(keys)
  await chrome.storage.sync.set(localValues)
}
