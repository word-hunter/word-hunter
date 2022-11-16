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

async function setup() {
  const storage = chrome.storage.local

  chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'word-hunter') {
      port.onMessage.addListener(async msg => {
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
