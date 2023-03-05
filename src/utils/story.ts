import { StorageKey, ContextMap } from '../constant'

const WORD_COUNT = 10

export async function createStory() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([StorageKey.context], async result => {
      const contexts = result[StorageKey.context] as ContextMap
      const words = Object.keys(contexts)
      const wordsSlice = shuffleArray(words).slice(0, WORD_COUNT)
      try {
        const res = await fetch('https://word-story.sapjax340.workers.dev/', {
          method: 'POST',
          body: JSON.stringify({
            words: wordsSlice
          })
        })
        const json = await res.json()
        const text = json.choices?.[0]?.text ?? ''
        resolve(text.replace(/\n\nTitle: (.*)\n\n/, '<h3>$1</h3>'))
      } catch (e: any) {
        reject(e)
      }
    })
  })
}

function shuffleArray(array: any[]) {
  const length = array.length

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * (length - i)) + i

    const temp = array[i]
    array[i] = array[randomIndex]
    array[randomIndex] = temp
  }

  return array
}
