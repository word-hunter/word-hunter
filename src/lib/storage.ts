import { StorageKey, WordMap, WordInfoMap, ContextMap } from '../constant'

const TOTAL_INDEX = 60000
const BUCKET_SIZE = 400
const BUCKET_PREFIX = '_b_'
const BUCKET_INDICES = new Array(TOTAL_INDEX / BUCKET_SIZE).fill(0).map((_, i) => BUCKET_PREFIX + i)

type BucketIndex = typeof BUCKET_INDICES[number]

function indexBitmap2Words(bucketIndex: number, bitmap: string, indexedWords: string[]) {
  const words = [] as string[]
  for (let i = 0; i < bitmap.length; i++) {
    if (bitmap[i] === '1') {
      const word = indexedWords[i + bucketIndex * BUCKET_SIZE]
      if (word) {
        words.push(word)
      }
    }
  }
  return words
}

function words2IndexBitmaps(words: string[], dict: WordInfoMap) {
  const bitmapMap: Record<string, string> = {}
  for (const word of words) {
    const index = dict[word].i
    if (index !== undefined) {
      const bucket = Math.floor(index / BUCKET_SIZE)
      const itemIndex = index % BUCKET_SIZE
      const bitmapKey = `${BUCKET_PREFIX}${bucket}`
      let bitmap = bitmapMap[bitmapKey] ?? '0'.repeat(BUCKET_SIZE)
      bitmapMap[bitmapKey] = bitmap.substring(0, itemIndex) + '1' + bitmap.substring(itemIndex + 1)
    }
  }
  return bitmapMap
}

function getIndexedWords(dict: WordInfoMap) {
  const indexedWords = []
  for (const word in dict) {
    const index = dict[word].i
    if (index !== undefined) {
      indexedWords[index] = word
    }
  }
  return indexedWords
}

export async function getAllKnownSync(loadedDict?: WordInfoMap) {
  if (!(await getSyncValue(DATA_MIGRATED))) {
    return await _getLegacyAllKnowns()
  } else {
    const dict = loadedDict ?? ((await getLocalValue(StorageKey.dict)) as WordInfoMap)
    const indexedWords = getIndexedWords(dict)
    const record = (await chrome.storage.sync.get(BUCKET_INDICES)) as Record<string, string>
    const words = Object.entries(record)
      .map(([bucket, bitmap]) => {
        const bucketIndex = Number(bucket.replace(BUCKET_PREFIX, ''))
        return indexBitmap2Words(bucketIndex, bitmap, indexedWords)
      })
      .flat()
    return Object.fromEntries(words.map(word => [word, 'o'])) as WordMap
  }
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

function bitmapAnd(bitmap1: string, bitmap2: string) {
  const bits = (BigInt(`0b${bitmap1}`) & BigInt(`0b${bitmap2}`)).toString(2)
  return bits.padStart(BUCKET_SIZE, '0')
}

function bitmapOr(bitmap1: string, bitmap2: string) {
  const bits = (BigInt(`0b${bitmap1}`) | BigInt(`0b${bitmap2}`)).toString(2)
  return bits.padStart(BUCKET_SIZE, '0')
}

export async function syncUpKnowns(words: string[], knownsInMemory: WordMap, updateTime: number = Date.now()) {
  await migrateToBitmap()
  const toSyncKnowns = {} as Record<BucketIndex, string>
  const dict = (await getLocalValue(StorageKey.dict)) as WordInfoMap
  const bitmaps = words2IndexBitmaps(words, dict)

  const localKnownsGroupByKeys = words2IndexBitmaps(Object.keys(knownsInMemory), dict)

  for (const bucket in bitmaps) {
    const localBitmap = localKnownsGroupByKeys[bucket] ?? '0'.repeat(BUCKET_SIZE)
    const remoteBitmap = (await getSyncValue(bucket)) ?? '0'.repeat(BUCKET_SIZE)
    const remoteWithDeleted = bitmapAnd(remoteBitmap, localBitmap)
    const addedWithDelete = bitmapAnd(bitmaps[bucket], localBitmap)
    const toUploadBitmap = bitmapOr(remoteWithDeleted, addedWithDelete)
    if (toUploadBitmap !== remoteBitmap) {
      toSyncKnowns[bucket] = toUploadBitmap
    }
  }

  if (Object.keys(toSyncKnowns).length > 0) {
    try {
      await chrome.storage.sync.set(toSyncKnowns)
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

export async function getSyncValue(key: StorageKey | LegacySyncIndexKey | BucketIndex) {
  return (await chrome.storage.sync.get(key))[key]
}

/**
 * group storage.sync items by word prefix, to avoid hitting the 512 items and 8kb limit per item.
 */
const _LEGACY_STORAGE_KEY_INDICES =
  'prot prop pres inte disc cont cons conc uns unr uni unf und unc una tri tra sup sub str sto ste sta spi spe sho sha scr sch sca sal ret res rep ref red rec rea pro pri pre pol per pen par mon mis min met mar man int ins inf ind inc imp hea har gra for ext exp dis des dep dem def dec cra cou cor con com col chi che cha cat car can cal bra bar bac ant zy zw zu zo zl zi ze za yu yt yo yl yi ye ya xy xm xe xa wy wu wr wo wi wh we wa vy vu vr vo vi ve va ux uv ut us ur up un um ul uk ui ug ud ub ua tz ty tw tu ts tr to ti th te tc ta sy sw sv su st sq sp so sn sm sl sk si sh sg sf se sc sa ry ru ro ri rh re ra qu qo qi qa py pu pt ps pr po pn pl pi ph pf pe pa oz oy ox ow ov ou ot os or op oo on om ol ok oj oi oh og of oe od oc ob oa ny nu nt no ni ng ne na my mu mo mn mi mf me ma ly lw lu lo ll li le la ky kw kv ku kr ko kn kl ki kh ke ka jy ju jo ji je ja iz ix iv it is ir ip io in im il ik ij ig if id ic ib ia hy hu hr ho hi he ha gy gu gr go gn gl gi gh ge ga fu fr fo fl fj fi fe fa ey ex ew ev eu et es er eq ep eo en em el ek ej ei eg ef ee ed ec eb ea dz dy dw du dr do dj di dh de da cz cy cu ct cr co cn cl ci ch ce ca by bu br bo bl bi bh be bd ba az ay ax aw av au at as ar aq ap ao an am al ak aj ai ah ag af ae ad ac ab aa a'.split(
    ' '
  )

type LegacySyncIndexKey = typeof _LEGACY_STORAGE_KEY_INDICES[number]
const DATA_MIGRATED = 'migrated_to_bitmap'
let migrating = false

async function migrateToBitmap() {
  if (migrating) return
  if (!(await getSyncValue(DATA_MIGRATED))) {
    migrating = true
    const wordMap = await _getLegacyAllKnowns()
    await syncUpKnowns(Object.keys(wordMap), wordMap)
    await chrome.storage.sync.remove(_LEGACY_STORAGE_KEY_INDICES)
    await chrome.storage.sync.set({ [DATA_MIGRATED]: true })
    migrating = false
  }
}

async function _getLegacyAllKnowns() {
  const record = (await chrome.storage.sync.get(_LEGACY_STORAGE_KEY_INDICES)) as Record<
    LegacySyncIndexKey,
    string[] | string
  >
  const wordEntries = Object.values(record)
    .map(valueAsArray)
    .flat()
    .filter(w => !!w)
    .map(word => [word, 0])
  return Object.fromEntries(wordEntries) as WordMap
}
