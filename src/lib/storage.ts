import { STORAGE_KEY_INDICES, StorageKey, WordMap, ContextMap } from '../constant'

export async function getAllKnownSync() {
  const record = (await chrome.storage.sync.get(STORAGE_KEY_INDICES)) as Record<string, string[]>
  const wordEntries = Object.values(record)
    .flat()
    .filter(w => !!w)
    .map(word => [word, 0])

  return Object.fromEntries(wordEntries) as WordMap
}

export async function syncUpKnowns(words: string[], knownsInMemory: WordMap, updateTime: number = Date.now()) {
  const toSyncKnowns = {} as Record<string, string[]>

  const localKnownsGroupByKeys = {} as Record<string, string[]>
  for (const word in knownsInMemory) {
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
        }
        break
      }
    }
  }

  // do not sync the keys doesn't changed
  for (const key of STORAGE_KEY_INDICES) {
    const remoteWordsOfkey = (await chrome.storage.sync.get(key))[key] ?? []
    if (toSyncKnowns[key] && remoteWordsOfkey.length === toSyncKnowns[key].length) {
      delete toSyncKnowns[key]
    }
  }
  if (Object.keys(toSyncKnowns).length > 0) {
    try {
      await chrome.storage.sync.set(toSyncKnowns)
      await chrome.storage.sync.set({
        [StorageKey.knwon_update_timestamp]: updateTime
      })
    } catch (e) {
      console.log(e)
    }
  }
}

export async function mergeKnowns(gDriveKnowns: WordMap = {}) {
  const KnownSynced = await getAllKnownSync()
  const mergedUpdateTime = Date.now()

  // sort by length
  const knownsList = [KnownSynced, gDriveKnowns].sort((a, b) => {
    return Object.keys(a).length - Object.keys(b).length
  })

  // current just merge all knowns to one object, keep words from all soruce
  const mergedKnowns = {}
  knownsList.forEach(knowns => {
    Object.assign(mergedKnowns, knowns)
  })

  if (Object.keys(mergedKnowns).length !== Object.keys(KnownSynced).length) {
    syncUpKnowns(Object.keys(mergedKnowns), mergedKnowns, mergedUpdateTime)
  }

  return [mergedKnowns, mergedUpdateTime] as const
}

export async function mergeContexts(remoteContext?: ContextMap, remoteUpdateTime: number = 0) {
  let localUpdateTime: number = (await getLocalValue(StorageKey.context_update_timestamp)) ?? 0
  const contextLocal: ContextMap = await getLocalValue(StorageKey.context)

  let mergedContexts = contextLocal
  let needUpdateLocal = false
  let needUpdateRemote = false
  let mergedUpdateTime = Date.now()

  if (remoteContext) {
    if (remoteUpdateTime > localUpdateTime) {
      mergedContexts = remoteContext
      needUpdateLocal = true
    }
    if (localUpdateTime > remoteUpdateTime) {
      needUpdateRemote = true
    }
  }

  await chrome.storage.local.set({
    [StorageKey.context]: mergedContexts,
    [StorageKey.context_update_timestamp]: mergedUpdateTime
  })
  return [mergedContexts, mergedUpdateTime] as const
}

// clean up unused context words
export function cleanupContexts(contexts: ContextMap, known: WordMap) {
  const cleanContexts = Object.fromEntries(
    Object.entries(contexts).filter(([word]) => {
      return !(word in known)
    })
  )
  return cleanContexts
}

export async function getLocalValue(key: StorageKey) {
  return (await chrome.storage.local.get(key))[key]
}

export async function getSyncValue(key: StorageKey) {
  return (await chrome.storage.sync.get(key))[key]
}
