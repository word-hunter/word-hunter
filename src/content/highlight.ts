import {
  invalidTags,
  Messages,
  WordContext,
  ContextMap,
  WordMap,
  WordInfoMap,
  wordRegex,
  wordReplaceRegex,
  StorageKey,
  cnRegex
} from '../constant'
import { createSignal } from 'solid-js'
import { getDocumentTitle, getFaviconUrl, settings, getSelectedDicts, getAllKnownSync } from '../lib'
import { getMessagePort } from '../lib/port'

declare global {
  interface Highlight extends Set<Range> {
    readonly priority: number
  }

  const Highlight: {
    prototype: Highlight
    new (...initialRanges: Array<Range>): Highlight
  }

  type HighlightRegistry = Map<string, Highlight>

  namespace CSS {
    const highlights: HighlightRegistry
  }
}

export const unknownHL = new Highlight()
export const contextHL = new Highlight()
CSS.highlights.set('wh-unknown', unknownHL)
CSS.highlights.set('wh-context', contextHL)

let wordsKnown: WordMap = {}
let fullDict: WordInfoMap = {}
let dict: WordInfoMap = {}
let contexts: ContextMap = {}

export const [zenExcludeWords, setZenExcludeWords] = createSignal<string[]>([])
export const [wordContexts, setWordContexts] = createSignal<WordContext[]>([])

export function getRangeWord(range: Range) {
  return range.toString().toLowerCase()
}

function isOriginFormSame(word1: string, word2: string) {
  return word1 === word2 || getOriginForm(word1) === getOriginForm(word2)
}

export function markAsKnown(word: string) {
  if (!wordRegex.test(word)) return

  const originFormWord = getOriginForm(word)
  wordsKnown[originFormWord] = 'o'
  getMessagePort().postMessage({ action: Messages.set_known, word: originFormWord })
}

function _makeAsKnown(word: string) {
  ;[unknownHL, contextHL].forEach(hl => {
    hl.forEach(range => {
      const rangeWord = getRangeWord(range)
      if (isOriginFormSame(rangeWord, word)) {
        hl.delete(range)
      }
    })
  })
}

function _makeAsUnknown(word: string) {
  delete wordsKnown[word]
  const textNodes = getTextNodes(document.body)
  highlight(textNodes, dict, wordsKnown, word)
}

export function addContext(word: string, text: string) {
  if (!wordRegex.test(word)) return
  const originFormWord = getOriginForm(word)

  const context: WordContext = {
    url: location.href,
    title: getDocumentTitle(),
    text: text,
    word: originFormWord,
    timestamp: Date.now(),
    favicon: getFaviconUrl()
  }
  getMessagePort().postMessage({ action: Messages.add_context, word: originFormWord, context })
}

function _addContext(context: WordContext) {
  const word = context.word
  if (!(contexts[word] ?? []).find(c => c.text === context.text)) {
    contexts[word] = [...(contexts[word] ?? []), context]
  }

  setWordContexts(contexts[word])
  unknownHL.forEach(range => {
    const rangeWord = getRangeWord(range)
    if (isOriginFormSame(rangeWord, word)) {
      unknownHL.delete(range)
      contextHL.add(range)
    }
  })
}

export function deleteContext(context: WordContext) {
  getMessagePort().postMessage({ action: Messages.delete_context, word: context.word, context })
}

function _deleteContext(context: WordContext) {
  const word = getOriginForm(context.word)
  const index = (contexts[word] ?? []).findIndex(c => c.text === context.text)
  if (index > -1) {
    contexts[word].splice(index, 1)

    setWordContexts([...contexts[word]])
    contextHL.forEach(range => {
      const rangeWord = getRangeWord(range)
      if (isOriginFormSame(rangeWord, word)) {
        contextHL.delete(range)
        unknownHL.add(range)
      }
    })
  }
}

export function markAsAllKnown() {
  const words = [...unknownHL.values(), ...contextHL.values()]
    .map(getRangeWord)
    .filter(word => wordRegex.test(word) && !zenExcludeWords().includes(word))
    .map(word => getOriginForm(word))
  getMessagePort().postMessage({ action: Messages.set_all_known, words })
}

function _makeAsAllKnown(words: string[]) {
  ;[unknownHL, contextHL].forEach(hl => {
    hl.forEach(range => {
      const rangeWord = getRangeWord(range)
      if (words.includes(rangeWord)) {
        hl.delete(range)
      }
    })
  })
}

function getTextNodes(node: Node): CharacterData[] {
  const textNodes = []
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, (node: Node) => {
    if (invalidTags.includes(node.nodeName?.toUpperCase())) {
      return NodeFilter.FILTER_REJECT
    } else {
      return NodeFilter.FILTER_ACCEPT
    }
  })

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as CharacterData)
  }

  return textNodes
}

let pausedWords: string[] = []
function autoPauseForYoutubeSubTitle(node: HTMLElement | null, toHighlightWords: string[]) {
  if (!location.host.endsWith('youtube.com') || !settings().autoPauseYoutubeVideo) return
  if (node?.classList.contains('ytp-caption-segment')) {
    const video = document.querySelector('video')
    if (!video?.paused) {
      let shouldPause = false
      for (const word of toHighlightWords) {
        if (!pausedWords.includes(word)) {
          pausedWords.push(word)
          shouldPause = true
        }
      }
      if (shouldPause) {
        video?.pause()
      }
    }
  }
}

let rangesWithRectAtMouseOverCache: { range: Range; rect: DOMRect }[] = []

document.addEventListener('mouseover', (e: MouseEvent) => {
  const node = e.target as HTMLElement
  const ranges = [...unknownHL.values(), ...contextHL.values()] as Range[]
  rangesWithRectAtMouseOverCache = ranges
    .filter(range => {
      return node.contains(range.commonAncestorContainer)
    })
    .map(range => {
      return {
        range,
        rect: range.getBoundingClientRect()
      }
    })
})

export function getRangeAtPoint(e: MouseEvent) {
  const rangeAtPoint = rangesWithRectAtMouseOverCache.find(
    ({ rect }) =>
      rect && rect.left <= e.clientX && rect.right >= e.clientX && rect.top <= e.clientY && rect.bottom >= e.clientY
  )
  return rangeAtPoint?.range ?? null
}

// TODO: show trans
function highlightTextNode(node: CharacterData, dict: WordInfoMap, wordsKnown: WordMap, word?: string) {
  const text = node.nodeValue || ''
  let arr
  let toHighlightWords = []
  while ((arr = wordReplaceRegex.exec(text)) !== null) {
    const w = arr[2]?.trim().toLowerCase()
    if (w in dict) {
      const originFormWord = getOriginForm(w)
      if (!(originFormWord in wordsKnown)) {
        if (word && word !== originFormWord) continue
        const range = new Range()
        range.setStart(node, arr.index)
        range.setEnd(node, arr.index + w.length)
        const contextLength = getWordContexts(w)?.length ?? 0
        if (contextLength > 0) {
          contextHL.add(range)
        } else {
          unknownHL.add(range)
        }
        toHighlightWords.push(w)
      }
    }
  }
  if (toHighlightWords.length > 0) {
    autoPauseForYoutubeSubTitle(node.parentElement, toHighlightWords)
  }
}

function highlight(textNodes: CharacterData[], dict: WordInfoMap, wordsKnown: WordMap, word?: string) {
  for (const node of textNodes) {
    if (invalidTags.includes(node.parentNode?.nodeName?.toUpperCase() ?? '')) {
      continue
    }

    highlightTextNode(node, dict, wordsKnown, word)
  }
}

async function waitForDictPrepare(): Promise<WordMap> {
  return new Promise(resolve => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes['dict']) {
        chrome.storage.onChanged.removeListener(listener)
        resolve(changes['dict'].newValue)
      }
    }
    chrome.storage.onChanged.addListener(listener)
  })
}

async function readStorageAndHighlight() {
  const result = await chrome.storage.local.get(['dict', StorageKey.context])
  fullDict = result.dict || (await waitForDictPrepare())
  dict = await getSelectedDicts(fullDict)
  wordsKnown = await getAllKnownSync()
  contexts = result[StorageKey.context] || {}

  const textNodes = getTextNodes(document.body)
  highlight(textNodes, dict, wordsKnown)
}

function resetHighlight() {
  dict = {}
  unknownHL.clear()
  contextHL.clear()
}

function observeDomChange() {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (!node.isConnected || !node.parentNode?.isConnected) {
            return false
          }
          if (node.nodeType === Node.TEXT_NODE) {
            highlight([node as CharacterData], dict, wordsKnown)
          } else {
            if ((node as HTMLElement).isContentEditable || node.parentElement?.isContentEditable) {
              return false
            }
            const textNodes = getTextNodes(node)
            highlight(textNodes, dict, wordsKnown)
          }
        })

        // when remove node, remove highlight range
        if (mutations.length > 0) {
          ;[unknownHL, contextHL].forEach(hl => {
            hl.forEach(r => {
              if (!r.toString()) {
                hl.delete(r)
              }
            })
          })
        }
      }
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  })
}

function getHighlightCount() {
  const contextWordsSet = new Set()
  const unknownWordSet = new Set()
  unknownHL.forEach((range: Range) => {
    const word = getRangeWord(range)
    unknownWordSet.add(word)
  })
  contextHL.forEach((range: Range) => {
    const word = getRangeWord(range)
    contextWordsSet.add(word)
  })
  return [unknownWordSet.size, contextWordsSet.size]
}

function getPageStatistics() {
  const words = [...(document.body.textContent ?? '').matchAll(/[a-z]+/gi)]
    .map(w => w[0].toLowerCase())
    .filter(w => w in dict)
  const wordCount = new Set(words).size
  const [unknownCount, haveContextCount] = getHighlightCount()
  return [unknownCount - haveContextCount, haveContextCount, wordCount] as const
}

// this function expose to be called in popup page
window.__getPageStatistics = getPageStatistics

window.__updateDicts = () => {
  resetHighlight()
  readStorageAndHighlight()
}

function listenBackgroundMessage() {
  chrome.runtime.onMessage.addListener((msg, sender: chrome.runtime.MessageSender) => {
    const { action, word, context } = msg
    switch (action) {
      case Messages.set_known:
        _makeAsKnown(word)
        break
      case Messages.set_all_known:
        _makeAsAllKnown(msg.words)
        break
      case Messages.set_unknown:
        _makeAsUnknown(word)
        break
      case Messages.add_context:
        _addContext(context)
        break
      case Messages.delete_context:
        _deleteContext(context)
        break
      default:
        break
    }
  })
}

export function isWordKnownAble(word: string) {
  return word in dict && !(getOriginForm(word) in wordsKnown)
}

export function isInDict(word: string) {
  return word?.toLowerCase() in dict
}

export function getOriginForm(word: string) {
  return fullDict[word]?.o ?? word
}

export function getWordAllTenses(word: string) {
  const originWord = getOriginForm(word)
  const words = Object.entries(fullDict)
    .filter(([_, info]) => info.o === originWord)
    .map(([w, _]) => w)
  return words
}

export function getWordContexts(word: string) {
  const originFormWord = getOriginForm(word)
  return contexts[originFormWord] ?? []
}

export async function init() {
  await readStorageAndHighlight()
  observeDomChange()
  listenBackgroundMessage()
}
