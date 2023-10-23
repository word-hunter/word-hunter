import {
  invalidTags,
  Messages,
  WordContext,
  ContextMap,
  WordMap,
  WordInfoMap,
  wordRegex,
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
  highlight(document.body)
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

function getTextNodes(node: Node): Text[] {
  const textNodes = []
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, (node: Node) => {
    if (invalidTags.includes(node.parentElement?.tagName ?? '')) {
      return NodeFilter.FILTER_REJECT
    } else {
      return NodeFilter.FILTER_ACCEPT
    }
  })

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
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
let lastMouseOverElement: Element | null = null

export function getRangeAtPoint(e: MouseEvent) {
  const element = e.target as HTMLElement
  if (element !== lastMouseOverElement) {
    lastMouseOverElement = element
    rangesWithRectAtMouseOverCache = [...unknownHL, ...contextHL]
      .map(range => {
        if (element === range.commonAncestorContainer?.parentElement) {
          const rect = range.getBoundingClientRect()
          return { range, rect }
        }
        return null
      })
      .filter(r => r !== null) as { range: Range; rect: DOMRect }[]
  }

  const rangeAtPoint = rangesWithRectAtMouseOverCache.find(
    ({ rect }) =>
      rect && rect.left <= e.clientX && rect.right >= e.clientX && rect.top <= e.clientY && rect.bottom >= e.clientY
  )
  return rangeAtPoint?.range ?? null
}

const segmenterEn = new Intl.Segmenter('en-US', { granularity: 'word' })
function highlightTextNode(node: CharacterData, dict: WordInfoMap, wordsKnown: WordMap, word?: string) {
  const text = node.nodeValue || ''
  let toHighlightWords = []
  const segments = segmenterEn.segment(text)

  const totalLength = node.length
  let preEnd = 0
  let curNode = node

  for (const segment of segments) {
    const w = segment.segment.toLowerCase()
    if (segment.isWordLike && w in dict) {
      const originFormWord = getOriginForm(w)
      if (!(originFormWord in wordsKnown)) {
        if (word && word !== originFormWord) continue
        const range = new Range()
        range.setStart(curNode, segment.index - preEnd)
        range.setEnd(curNode, segment.index - preEnd + w.length)

        const trans = settings().showCnTrans && fullDict[originFormWord]?.t
        if (trans) {
          // avoid duplicated
          if (range.endContainer.nextSibling?.nodeName === 'W-MARK-T') {
            continue
          }
          // insert trans tag after range
          const newRange = range.cloneRange()
          newRange.collapse(false)
          const transNode = document.createElement('w-mark-t')
          transNode.textContent = `(${cnRegex.exec(trans)?.[0]})`
          transNode.dataset.trans = `(${trans})`
          // TODO: insertNode performance is terrible, need to optimize
          newRange.insertNode(transNode)
          newRange.detach()
          // if transNode is not the last node, move cursor to next text node
          preEnd = segment.index + w.length
          if (preEnd < totalLength) {
            curNode = transNode.nextSibling as Text
          }
        }

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

function isTextNodeValid(textNode: Text) {
  return !invalidTags.includes(textNode.parentNode?.nodeName?.toUpperCase() ?? '')
}

function highlight(node: Node, word?: string) {
  const textNodes = getTextNodes(node)
  for (const node of textNodes) {
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

  highlight(document.body)
}

function resetHighlight() {
  dict = {}
  unknownHL.clear()
  contextHL.clear()
}

let cleanRangeTaskTimer: number
function cleanRanges() {
  ;[unknownHL, contextHL].forEach(hl => {
    hl.forEach(range => {
      if (!range.toString()) {
        hl.delete(range)
      }
    })
  })
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
            if (isTextNodeValid(node as Text)) {
              highlightTextNode(node as Text, dict, wordsKnown)
            }
          } else {
            if ((node as HTMLElement).isContentEditable || node.parentElement?.isContentEditable) {
              return false
            }
            highlight(node)
          }
        })

        // when remove node, remove highlight range
        if (mutation.removedNodes.length > 0) {
          cleanRangeTaskTimer && clearTimeout(cleanRangeTaskTimer)
          cleanRangeTaskTimer = setTimeout(cleanRanges, 100)
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
  return [unknownCount, haveContextCount, wordCount] as const
}

// this function expose to be called in popup page
window.__getPageStatistics = getPageStatistics

window.__updateDicts = () => {
  document.querySelectorAll('w-mark-t').forEach(node => {
    node.remove()
  })
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
