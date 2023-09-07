import { Messages, WordMap, WordContext, StorageKey } from '../constant'
import { explainWord } from '../lib/openai'
import { syncUpKnowns, mergeKnowns } from '../lib/storage'
import { mergeSettings } from '../lib/settings'
import { getAllTenses } from '../lib/tense'

let dict: WordMap = {}

async function readDict(): Promise<WordMap> {
  const url = chrome.runtime.getURL('dict.json')
  const res = await fetch(url)
  const dict = await res.text()
  return JSON.parse(dict)
}

function updateBadge(wordsKnown: WordMap) {
  const knownWordsCount = Object.keys(wordsKnown).length
  let badgeText = knownWordsCount > 0 ? String(knownWordsCount) : ''
  if (knownWordsCount >= 1000 && knownWordsCount < 10000) {
    badgeText = badgeText.at(0) + '.' + badgeText.at(1) + 'k'
  }
  if (knownWordsCount >= 10000) {
    badgeText = badgeText.at(0)! + badgeText.at(1) + 'k'
  }
  chrome.action.setBadgeText({ text: String(knownWordsCount) })
  setTimeout(() => {
    chrome.action.setBadgeText({ text: badgeText })
  }, 5000)
  chrome.action.setBadgeBackgroundColor({ color: '#bbb' })
  chrome.action.setTitle({ title: '✔ ' + String(knownWordsCount) })
}

const playAudio = async (audio: string) => {
  const autioPageUrl = chrome.runtime.getURL('audio.html')

  if (!chrome.offscreen) {
    return createAudioWindow(`${autioPageUrl}?audio=${encodeURIComponent(audio)}`)
  }

  await setupOffscreenDocument(autioPageUrl)
  chrome.runtime.sendMessage({
    type: 'play-audio',
    target: 'offscreen',
    data: audio
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
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    })
    return existingContexts.length > 0
  } else if (globalThis.clients) {
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

function sendMessageToAllTabs(msg: any) {
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id!, msg)
    }
  })
}

/**
 * https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension/66618269#66618269
 * chrome connection will be auto disconnected after 5 minutes
 * so, we manually disconnect it after 4 minutes, then reconnect it in context script
 * to make sure the connection is always alive
 */
function autoDisconnectDelay(port: chrome.runtime.Port, tabId?: number) {
  if (!tabId) return
  setTimeout(() => {
    chrome.tabs.query({ currentWindow: true }, tabs => {
      const tab = tabs.find(t => t.id === tabId)
      if (tab) {
        port.disconnect()
      }
    })
  }, 250000)
}

async function setup() {
  const storage = chrome.storage.local

  chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'word-hunter') {
      const tabId = port.sender?.tab?.id
      autoDisconnectDelay(port, tabId)

      port.onMessage.addListener(async msg => {
        const { action, word, words, context } = msg
        switch (action) {
          case Messages.set_known:
            storage.get([StorageKey.known], result => {
              const wordsWithAllTense = getAllTenses(word, dict)
              const toAddWords: WordMap = {}
              for (const w of wordsWithAllTense) {
                toAddWords[w] = 'o'
              }
              const knownWords = { ...(result[StorageKey.known] ?? {}), ...toAddWords }
              storage.set({ [StorageKey.known]: knownWords })
              updateBadge(knownWords)
              syncUpKnowns([word], knownWords)
              sendMessageToAllTabs({ action, word })
            })
            break
          case Messages.set_all_known:
            storage.get([StorageKey.known], result => {
              const addedWords = words.reduce((acc: WordMap, cur: string) => ({ ...acc, [cur]: 'o' }), {})
              const knownWords = { ...(result[StorageKey.known] ?? {}), ...addedWords }
              storage.set({ [StorageKey.known]: knownWords })
              updateBadge(knownWords)
              syncUpKnowns(words, knownWords)
              sendMessageToAllTabs({ action, words })
            })
            break
          case Messages.add_context:
            storage.get([StorageKey.context], result => {
              const contexts = result[StorageKey.context] ?? {}
              const wordContexts = (contexts[word] ?? []) as WordContext[]
              if (!wordContexts.find(c => c.text === context.text)) {
                const newContexts = { ...contexts, [word]: [...wordContexts, context] }
                storage.set({ [StorageKey.context]: newContexts })
              }
              sendMessageToAllTabs({ action, context })
            })
            break
          case Messages.delete_context:
            storage.get([StorageKey.context], result => {
              const contexts = result[StorageKey.context] ?? {}
              const wordContexts = (contexts[word] ?? []) as WordContext[]
              const index = wordContexts.findIndex(c => c.text === context.text)
              if (index > -1) {
                wordContexts.splice(index, 1)
                const { [word]: w, ...rest } = contexts
                storage.set({
                  [StorageKey.context]: wordContexts.length > 0 ? { ...rest, [word]: wordContexts } : rest
                })
                sendMessageToAllTabs({ action, context })
              }
            })
            break
          case Messages.play_audio:
            playAudio(msg.audio)
            break
          case Messages.open_youglish:
            chrome.tabs.create({
              url: chrome.runtime.getURL('youglish.html') + `?word=${encodeURIComponent(word)}`
            })
            break
          case Messages.fetch_html: {
            const { url, uuid } = msg
            const htmlRes = await fetch(url, {
              mode: 'no-cors',
              credentials: 'include'
            })
            const htmlText = await htmlRes.text()
            port.postMessage({ result: htmlText, uuid })
            break
          }
          case Messages.ai_explain:
            const { text, uuid } = msg
            const explain = await explainWord(word, text)
            port.postMessage({ result: explain, uuid })
        }
      })
    }
  })

  chrome.runtime.onMessage.addListener(msg => {
    if (Messages.app_available in msg) {
      chrome.action.setIcon({
        path: {
          128: msg.app_available ? chrome.runtime.getURL('icon.png') : chrome.runtime.getURL('icons/blind.png')
        }
      })

      storage.get([StorageKey.known], result => {
        updateBadge(msg.app_available ? result[StorageKey.known] || {} : {})
      })
    }
  })

  await mergeKnowns()
  await mergeSettings()

  readDict().then(localDict => {
    dict = localDict
    storage.set({ dict: localDict }, () => {
      console.log('[storage] dict set up')
    })
  })
}

setup()
