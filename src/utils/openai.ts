import { createSignal } from 'solid-js'
import { StorageKey, ContextMap } from '../constant'
import { safeEmphasizeWordInText } from './index'

const WORD_COUNT = 10
export const [apiKey, setApiKeyVar] = createSignal<string>('')

chrome.storage.local.get([StorageKey.openaiKey], result => {
  setApiKeyVar(result[StorageKey.openaiKey] ?? '')
})

export function setApiKey(key: string) {
  chrome.storage.local.set({ [StorageKey.openaiKey]: key })
  setApiKeyVar(key)
}

function getHeaders() {
  return new Headers({ Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' })
}

export async function explainWord(word: string, context: string) {
  const headers = await getHeaders()
  const prompt = `Can you explain the word ${word} in the sentence "${context}" with grade 2 English words ?`
  try {
    const res = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt: prompt,
        temperature: 0.8,
        max_tokens: 200,
        top_p: 1.0,
        frequency_penalty: 0.5,
        presence_penalty: 0.0
      })
    })
    const json = await res.json()
    if (res.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your API key in the extension settings.')
    } else if (res.status !== 200) {
      throw json.error
    }
    const text = json.choices?.[0]?.text ?? ''
    return safeEmphasizeWordInText(text.replace('\n\n', '\n').replaceAll('. ', '. \n\n'), word)
  } catch (e: any) {
    return e.message
  }
}

export async function createStory() {
  const headers = await getHeaders()
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([StorageKey.context], async result => {
      const contexts = result[StorageKey.context] as ContextMap
      const words = Object.keys(contexts)
      const wordsSlice = shuffleArray(words).slice(0, WORD_COUNT)
      const prompt = `Can you please generate a children's story for me that includes the following words: ${wordsSlice.join(
        ','
      )}?  and give the story a title, the story should have reasonable story logic, and use easy-to-understand English words.Thank you!`
      try {
        const res = await fetch('https://api.openai.com/v1/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'text-davinci-003',
            prompt: prompt,
            temperature: 0.8,
            max_tokens: 1000,
            top_p: 1.0,
            frequency_penalty: 0.5,
            presence_penalty: 0.0
          })
        })
        const json = await res.json()
        if (res.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your API key in the extension settings.')
        } else if (res.status !== 200) {
          throw json.error
        }
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
