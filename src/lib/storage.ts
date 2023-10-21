import { STORAGE_KEY_INDICES, StorageKey, WordMap, WordInfoMap, ContextMap } from '../constant'

type SyncIndexKey = (typeof STORAGE_KEY_INDICES)[number]

export async function getAllKnownSync() {
  const record = (await chrome.storage.sync.get(STORAGE_KEY_INDICES)) as Record<SyncIndexKey, string[] | string>
  const wordEntries = Object.values(record)
    .map(valueAsArray)
    .flat()
    .filter(w => !!w)
    .map(word => [word, 0])

  return Object.fromEntries(wordEntries) as WordMap
}

function valueAsArray(value: string[] | string) {
  if (Array.isArray(value)) {
    return value
  } else if (typeof value === 'string') {
    return value.split(' ')
  } else {
    return []
  }
}

export async function syncUpKnowns(words: string[], knownsInMemory: WordMap, updateTime: number = Date.now()) {
  const toSyncKnowns = {} as Record<SyncIndexKey, string[]>

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

        // remove the word as unknown
        if (!(word in knownsInMemory) && toSyncKnowns[key].includes(word)) {
          toSyncKnowns[key].splice(toSyncKnowns[key].indexOf(word), 1)
        }

        break
      }
    }
  }

  // do not sync the keys doesn't changed
  for (const key of STORAGE_KEY_INDICES) {
    const remoteWordsOfkey = await getSyncValue(key)
    if (toSyncKnowns[key] && valueAsArray(remoteWordsOfkey).length === toSyncKnowns[key].length) {
      if (!Array.isArray(remoteWordsOfkey)) {
        delete toSyncKnowns[key]
      }
    }
  }
  if (Object.keys(toSyncKnowns).length > 0) {
    const savedKnwons = {} as Record<SyncIndexKey, string>
    for (const key in toSyncKnowns) {
      // save as string to reduce the storage size
      savedKnwons[key] = toSyncKnowns[key].join(' ')
    }
    try {
      await chrome.storage.sync.set(savedKnwons)
      await chrome.storage.sync.set({
        [StorageKey.knwon_update_timestamp]: updateTime
      })
    } catch (e) {
      console.error(e)
    }
  }
}

export async function mergeKnowns(gDriveKnowns: WordMap) {
  const KnownSynced = await getAllKnownSync()
  const mergedUpdateTime = Date.now()

  if (!gDriveKnowns) return [KnownSynced, mergedUpdateTime] as const

  // sort by length
  const knownsList = [KnownSynced, gDriveKnowns].sort((a, b) => {
    return Object.keys(a).length - Object.keys(b).length
  })

  // current just merge all knowns to one object, keep words from all soruce
  const mergedKnowns = {}
  knownsList.forEach(knowns => {
    Object.assign(mergedKnowns, knowns)
  })

  // only keep origin knowns, this is a clean strategy for the old version of the extension
  const dict = (await getLocalValue(StorageKey.dict)) as WordInfoMap
  let mergedOriginKnowns: WordMap
  if (dict) {
    mergedOriginKnowns = {}
    for (const word in mergedKnowns) {
      const origin = dict[word].o
      mergedOriginKnowns[origin] = 'o'
    }
  } else {
    mergedOriginKnowns = mergedKnowns
  }

  if (Object.keys(mergedOriginKnowns).length !== Object.keys(KnownSynced).length) {
    syncUpKnowns(Object.keys(mergedOriginKnowns), mergedOriginKnowns, mergedUpdateTime)
  }

  return [mergedOriginKnowns, mergedUpdateTime] as const
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

export type KnownsLogs = [string, number][]

export async function addLocalKnownsLogs(words: string[]) {
  const localKnownsLogs: KnownsLogs = (await getLocalValue(StorageKey.local_knowns_log)) ?? []
  const now = Date.now()
  words.forEach(word => {
    if (!localKnownsLogs.find(([w]) => w === word)) {
      localKnownsLogs.push([word, now])
    }
  })
  chrome.storage.local.set({
    // record latest 1000 logs
    [StorageKey.local_knowns_log]: localKnownsLogs.slice(-1000)
  })
}

export async function removeLocalKnownsLogs(word: string) {
  const localKnownsLogs: KnownsLogs = (await getLocalValue(StorageKey.local_knowns_log)) ?? []
  const index = localKnownsLogs.findIndex(([w]) => w === word)
  if (index > -1) {
    localKnownsLogs.splice(index, 1)
    chrome.storage.local.set({
      [StorageKey.local_knowns_log]: localKnownsLogs
    })
  }
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

export async function getSyncValue(key: StorageKey | (typeof STORAGE_KEY_INDICES)[number]) {
  return (await chrome.storage.sync.get(key))[key]
}
