import { Messages, WordMap, WordInfoMap, WordContext, StorageKey, LevelKey } from '../constant'
import { explainWord } from '../lib/openai'
import { syncUpKnowns, getLocalValue, getAllKnownSync } from '../lib/storage'
import { settings } from '../lib/settings'
import { syncWithDrive, triggerSyncJob } from '../lib/backup/sync'
import { onMessage } from 'webext-bridge/background'
import { ProtocolMap } from 'webext-bridge'

let dict: WordInfoMap
let knowns: WordMap

async function readDict(): Promise<WordInfoMap> {
  const [dict, trans] = await Promise.all([getDictTxt(), getZhTransJson()])
  const lines = dict.split('\n')
  const wordInfoMap: WordInfoMap = {}

  let i = 0
  lines.forEach(line => {
    const [word, origin, level] = line.split(/\s+/)
    wordInfoMap[word] = { o: origin, l: level as LevelKey }
    if (trans[origin]) {
      wordInfoMap[word].t = trans[origin]
    }
    if (word === origin) {
      wordInfoMap[word].i = i
      i++
    }
  })
  return wordInfoMap
}

async function getDictTxt() {
  const url = chrome.runtime.getURL('eng-dict.txt')
  const res = await fetch(url)
  return await res.text()
}

async function getZhTransJson() {
  const url = chrome.runtime.getURL('zh-trans.json')
  const res = await fetch(url)
  return await res.json()
}

function updateBadge(wordsKnown: WordMap) {
  const knownWordsCount = Object.keys(wordsKnown).length
  let badgeText = knownWordsCount > 0 ? String(knownWordsCount) : ''
  if (knownWordsCount >= 10000) {
    badgeText = badgeText.at(0)! + badgeText.at(1) + 'k'
  }
  chrome.action.setBadgeText({ text: badgeText })
  chrome.action.setBadgeBackgroundColor({ color: '#666' })
  chrome.action.setTitle({ title: '✔ ' + String(knownWordsCount) })
}

const playAudio = async (audio: string | null, word?: string) => {
  const volume = settings().volume ?? 100
  if (!audio && word) {
    chrome.tts.speak(word, { lang: 'en-US', rate: 0.7, volume: volume / 100 })
    return
  }
  const audioPageUrl = chrome.runtime.getURL('audio.html')

  if (audio && !chrome.offscreen) {
    return createAudioWindow(`${audioPageUrl}?audio=${encodeURIComponent(audio)}&?volume=${volume}`)
  }

  await setupOffscreenDocument(audioPageUrl)
  chrome.runtime.sendMessage({
    type: 'play-audio',
    target: 'offscreen',
    data: {
      audio,
      volume
    }
  })
}

let creating: any // A global promise to avoid concurrency issues
const setupOffscreenDocument = async (path: string) => {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  if (await checkOffscreenDocumentExist(path)) return

  if (creating) {
    // create offscreen document
    await creating
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'play audio for word pronunciation'
    })
    await creating
    creating = null
  }
}

const checkOffscreenDocumentExist = async (offscreenUrl: string) => {
  if (chrome.runtime.getContexts) {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      documentUrls: [offscreenUrl]
    })
    return existingContexts.length > 0
    // @ts-ignore
  } else if (globalThis.clients) {
    // @ts-ignore
    const matchedClients = await globalThis.clients.matchAll()

    for (const client of matchedClients) {
      if (client.url === offscreenUrl) {
        return true
      }
    }
    return false
  }
  return false
}

const createAudioWindow = async (url: string) => {
  await chrome.windows.create({
    type: 'popup',
    focused: false,
    top: 1,
    left: 1,
    height: 1,
    width: 1,
    url
  })
}

async function sendMessageToAllTabs<T extends Messages>(action: T, data: ProtocolMap[T]) {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    // Note: use chrome.tabs.sendMessage instead of sendMessage from webext-bridge
    // because the sendMessage from webext-bridge is only send to main frame by default
    // but we need to send message to all frames
    chrome.tabs.sendMessage(tab.id!, { action, ...data })
  }
}

onMessage(Messages.set_known, async ({ data }) => {
  knowns = knowns ?? (await getAllKnownSync())
  const { word } = data
  knowns[word] = 'o'
  await syncUpKnowns([word], knowns, Date.now())
  deleteContextWords([word])
  updateBadge(knowns)
  sendMessageToAllTabs(Messages.set_known, { word })
  triggerSyncJob()
})

onMessage(Messages.set_all_known, async ({ data }) => {
  knowns = knowns ?? (await getAllKnownSync())
  const { words } = data
  const addedWords = words.reduce((acc: WordMap, cur: string) => ({ ...acc, [cur]: 'o' as LevelKey }), {})
  Object.assign(knowns, addedWords)
  await syncUpKnowns(words, knowns, Date.now())
  deleteContextWords(words)
  updateBadge(knowns)
  sendMessageToAllTabs(Messages.set_all_known, { words })
  triggerSyncJob()
})

onMessage(Messages.add_context, async ({ data }) => {
  const { word, context } = data
  const contexts = (await getLocalValue(StorageKey.context)) ?? {}
  // record context in normal tense word key
  const wordContexts = (contexts[word] ?? []) as WordContext[]
  if (!wordContexts.find(c => c.text === context.text)) {
    const newContexts = { ...contexts, [word]: [...wordContexts, context] }
    chrome.storage.local.set({
      [StorageKey.context]: newContexts,
      [StorageKey.context_update_timestamp]: Date.now()
    })
  }
  sendMessageToAllTabs(Messages.add_context, { word, context })
  triggerSyncJob()
})

onMessage(Messages.delete_context, async ({ data }) => {
  const { word, context } = data
  const contexts = (await getLocalValue(StorageKey.context)) ?? {}
  // delete context in normal tense word key
  const wordContexts = (contexts[word] ?? []) as WordContext[]
  const index = wordContexts.findIndex(c => c.text === context.text)
  if (index > -1) {
    wordContexts.splice(index, 1)
    const { [word]: w, ...rest } = contexts
    chrome.storage.local.set({
      [StorageKey.context]: wordContexts.length > 0 ? { ...rest, [word]: wordContexts } : rest,
      [StorageKey.context_update_timestamp]: Date.now()
    })
    sendMessageToAllTabs(Messages.delete_context, { word, context })
    triggerSyncJob()
  }
})

onMessage(Messages.play_audio, async ({ data }) => {
  const { audio, word } = data
  playAudio(audio, word)
})

onMessage(Messages.fetch_html, async ({ data }) => {
  const { url, isPreload } = data
  const option: RequestInit = isPreload
    ? {
        priority: 'low',
        signal: AbortSignal.timeout(5000)
      }
    : {}

  let htmlText: string | { isError: boolean; message: string }
  try {
    const htmlRes = await fetch(url, {
      mode: 'no-cors',
      credentials: 'include',
      ...option
    })
    htmlText = await htmlRes.text()
  } catch (e: any) {
    htmlText = { isError: true, message: e.message }
  }
  return htmlText
})

onMessage(Messages.ai_explain, async ({ data }) => {
  const { word, text } = data
  const explain = await explainWord(word, text, settings().openai.model)
  return explain
})

async function deleteContextWords(words: string[]) {
  const contexts = (await getLocalValue(StorageKey.context)) ?? {}
  let isChanged = false
  words.forEach(word => {
    if (contexts.hasOwnProperty(word)) {
      delete contexts[word]
      isChanged = true
    }
  })
  if (isChanged) {
    await chrome.storage.local.set({
      [StorageKey.context]: contexts,
      [StorageKey.context_update_timestamp]: Date.now()
    })
  }
}

onMessage(Messages.app_available, async ({ data }) => {
  const { app_available } = data
  chrome.action.setIcon({
    path: {
      128: app_available ? chrome.runtime.getURL('icon.png') : chrome.runtime.getURL('icons/blind.png')
    }
  })

  chrome.storage.local.set({ [Messages.app_available]: app_available })
  knowns = knowns ?? (await getAllKnownSync())
  updateBadge(app_available ? knowns : {})
})

// https://developer.chrome.com/docs/extensions/reference/contextMenus/#event-onInstalled
chrome.runtime.onInstalled.addListener(async details => {
  chrome.contextMenus.create({
    id: 'word-hunter',
    title: 'Mark As Unknown',
    contexts: ['selection']
  })

  readDict().then(async localDict => {
    dict = localDict
    chrome.storage.local.set({ dict: localDict }, async () => {
      console.log('[storage] dict set up when ' + details.reason)
      knowns = knowns ?? (await getAllKnownSync())
      updateBadge(knowns)
    })
  })
})

function setFailedBadge(message: string) {
  chrome.action.setBadgeText({ text: '❌' })
  chrome.action.setTitle({ title: 'Google drive sync failed: ' + message })
}

chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local' && changes[StorageKey.sync_failed_message]) {
    const { newValue } = changes[StorageKey.sync_failed_message]
    if (!!newValue) {
      setFailedBadge(newValue)
    } else {
      updateBadge(knowns)
    }
  }
  if (namespace === 'sync' && changes[StorageKey.knwon_update_timestamp]) {
    knowns = await getAllKnownSync()
    updateBadge(knowns)
  }
})

//avoid reactivate service worker invoke syncWithDrive multiple times
chrome.runtime.onStartup.addListener(async () => {
  chrome.storage.local.set({ [Messages.app_available]: true })
  knowns = await getAllKnownSync()

  updateBadge(knowns)

  const syncFailedMessage = await getLocalValue(StorageKey.sync_failed_message)
  if (syncFailedMessage) {
    setFailedBadge(syncFailedMessage)
  }
  syncWithDrive(false)
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'word-hunter') {
    const word = info.selectionText?.trim()?.toLowerCase()
    dict = dict ?? (await getLocalValue(StorageKey.dict))
    if (word && word in dict) {
      const originFormWord = dict[word]?.o ?? word
      knowns = knowns ?? (await getAllKnownSync())
      delete knowns[originFormWord]
      await syncUpKnowns([originFormWord], knowns, Date.now())
      updateBadge(knowns)
      sendMessageToAllTabs(Messages.set_unknown, { word: originFormWord })
      triggerSyncJob()
    }
  }
})

chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false })
