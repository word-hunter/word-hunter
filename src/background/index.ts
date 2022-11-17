import { Dict, Messages, WordMap, WordType } from '../constant'

async function readDict(): Promise<Dict> {
  const url = chrome.runtime.getURL('./public/dict.json')
  const res = await fetch(url)
  const dict = await res.text()
  return JSON.parse(dict)
}

function updateBadge(wordsKnown: WordMap) {
  const knownWordsCount = Object.keys(wordsKnown).length
  chrome.action.setBadgeText({ text: String(knownWordsCount) }, () => {})
  chrome.action.setBadgeBackgroundColor({ color: '#bbb' }, () => {})
}

/**
 * https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension/66618269#66618269
 * chrome connection will be auto disconnected after 5 minutes
 * so, we manually disconnect it after 4 minutes, then reconnect it in context script
 * to make sure the connection is always alive
 */
function autoDisconnectDelay(port, tabId?: number) {
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
      console.log('tabId', tabId)
      autoDisconnectDelay(port, tabId)

      port.onMessage.addListener(async msg => {
        console.log(port.sender?.id, port.sender?.tab?.id)
        const { action, word, context, words } = msg
        switch (action) {
          case Messages.set_known:
            storage.get([WordType.known, WordType.half], result => {
              const knownWords = { ...(result[WordType.known] ?? {}), [word]: 0 }
              const halfWords = result[WordType.half] ?? {}
              if (word in halfWords) {
                delete halfWords[word]
                storage.set({ [WordType.known]: knownWords, [WordType.half]: halfWords })
              } else {
                storage.set({ [WordType.known]: knownWords })
              }
              updateBadge(knownWords)
            })
            break
          case Messages.set_known_half:
            storage.get([WordType.half], result => {
              storage.set({ [WordType.half]: { ...(result[WordType.half] ?? {}), [word]: context } })
            })
            break
          case Messages.set_all_known:
            storage.get([WordType.known], result => {
              const addedWords = words.reduce((acc, cur) => ({ ...acc, [cur]: 0 }), {})
              const knownWords = { ...(result[WordType.known] ?? {}), ...addedWords }
              storage.set({ [WordType.known]: knownWords })
              updateBadge(knownWords)
            })
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
