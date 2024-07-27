import { createSignal } from 'solid-js'
import { debounce } from './utils'
import { Adapter } from '../content/adapters'

const MAX_PRELOAD_COUNT = 200
const [preloadQueue, _setPreloadQueue] = createSignal<Set<string>>(new Set())
const [preloading, setPreloading] = createSignal(false)
const [preloadedWords, setPreloadWords] = createSignal<Set<string>>(new Set())

const setPreloadQueue = (words: Set<string> = new Set()) => {
  if (preloadedWords().size < MAX_PRELOAD_COUNT) {
    _setPreloadQueue(words)
  }
}

const nextPreloadWords = () => {
  return [...preloadQueue()].filter(word => !preloadedWords().has(word)).slice(0, 4)
}

const wordRetryCounts = new Map<string, number>()

const preloadDebounce = debounce((words: string[], dictAdapter: Adapter) => {
  requestIdleCallback(async () => {
    if (dictAdapter.name === 'openai') return
    setPreloading(true)
    const loadedWrods: string[] = []
    await Promise.allSettled(
      words.map(word =>
        dictAdapter
          .lookup({ word, isPreload: true })
          .then(() => {
            loadedWrods.push(word)
          })
          .catch(e => {
            // if retry 3 times, then skip this word next time
            wordRetryCounts.set(word, (wordRetryCounts.get(word) || 0) + 1)
            if ((wordRetryCounts.get(word) || 0) >= 3) {
              loadedWrods.push(word)
            }
          })
      )
    )
    setPreloading(false)
    setPreloadWords(new Set([...preloadedWords(), ...loadedWrods]))
  })
}, 500)

const preload = (dictAdapter: Adapter) => {
  if (preloading() || preloadedWords().size > MAX_PRELOAD_COUNT) return
  const words = nextPreloadWords()
  if (words.length > 0) {
    preloadDebounce(words, dictAdapter)
  }
}

export { preload, preloadQueue, setPreloadQueue }
