import { Messages, WordMap, WordType } from '../constant'

async function readDict(): Promise<WordMap> {
  const url = chrome.runtime.getURL('dict.json')
  const res = await fetch(url)
  const dict = await res.text()
  return JSON.parse(dict)
}

function updateBadge(wordsKnown: WordMap) {
  const knownWordsCount = Object.keys(wordsKnown).length
  chrome.action.setBadgeText({ text: String(knownWordsCount) }, () => {})
  chrome.action.setBadgeBackgroundColor({ color: '#bbb' }, () => {})
}

const createAudioWindow = async (audio: string) => {
  let url = chrome.runtime.getURL('audio.html')
  url = `${url}?audio=${encodeURIComponent(audio)}`
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
        const { action, word, words } = msg
        switch (action) {
          case Messages.set_known:
            storage.get([WordType.known], result => {
              const knownWords = { ...(result[WordType.known] ?? {}), [word]: 0 }
              storage.set({ [WordType.known]: knownWords })
              updateBadge(knownWords)
            })
            break
          case Messages.set_all_known:
            storage.get([WordType.known], result => {
              const addedWords = words.reduce((acc: WordMap, cur: string) => ({ ...acc, [cur]: 0 }), {})
              const knownWords = { ...(result[WordType.known] ?? {}), ...addedWords }
              storage.set({ [WordType.known]: knownWords })
              updateBadge(knownWords)
            })
            break
          case Messages.play_audio:
            createAudioWindow(msg.audio)
            break
        }
      })
    }
  })

  const dict = await readDict()

  storage.set({ dict: dict }, () => {
    console.log('[storage] dict set up')
  })

  storage.get([WordType.known], result => {
    updateBadge(result[WordType.known] || {})
  })
}

setup()
