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
import { getDocumentTitle, getFaviconUrl, settings, getSelectedDicts, getAllKnownSync, debounce } from '../lib'
import { getMessagePort } from '../lib/port'

export const unknownHL = new Highlight()
export const contextHL = new Highlight()
CSS.highlights.set('wh-unknown', unknownHL)
CSS.highlights.set('wh-context', contextHL)

let wordsKnown: WordMap = {}
let fullDict: WordInfoMap = {}
let dict: WordInfoMap = {}
let contexts: ContextMap = {}
let highlightContainerMap = new WeakMap<Node, Set<Range>>()

export const [zenExcludeWords, setZenExcludeWords] = createSignal<string[]>([])
export const [wordContexts, setWordContexts] = createSignal<WordContext[]>([])

export function getRangeWord(range: AbstractRange) {
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
        detachRange(range as Range)
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
  let url = location.href
  if (url.startsWith('https://www.youtube.com/watch')) {
    const videoPlayer = document.querySelector('.video-stream.html5-main-video') as HTMLVideoElement
    if (videoPlayer) {
      const time = Math.floor(videoPlayer.currentTime)
      const _url = new URL(url)
      _url.searchParams.set('t', time.toString())
      url = _url.toString()
    }
  }

  const context: WordContext = {
    url,
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
    if (contexts[word].length === 0) {
      contextHL.forEach(range => {
        const rangeWord = getRangeWord(range)
        if (isOriginFormSame(rangeWord, word)) {
          contextHL.delete(range)
          unknownHL.add(range)
        }
      })
    }
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
        detachRange(range as Range)
      }
    })
  })
}

function detachRange(range: Range) {
  highlightContainerMap.get(range.startContainer.parentNode!)?.delete(range)
  range.detach()
}

function getTextNodes(node: Node): Text[] {
  const textNodes = []
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)

  while (walker.nextNode()) {
    !invalidTags.includes(walker.currentNode.parentElement?.tagName ?? '') && textNodes.push(walker.currentNode as Text)
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

export function getRangeAtPoint(e: MouseEvent) {
  const element = e.target as HTMLElement

  const rangeAtPoint = Array.from(highlightContainerMap.get(element) ?? []).find(range => {
    const rect = range.getBoundingClientRect()
    return (
      rect && rect.left <= e.clientX && rect.right >= e.clientX && rect.top <= e.clientY && rect.bottom >= e.clientY
    )
  })
  return rangeAtPoint ?? null
}

let transObjects: {
  range: Range
  pNode: Element
  trans: string
  inserted?: boolean
}[] = []

const intersectionObserver = new IntersectionObserver(entries => {
  entries.forEach(
    entry => {
      const el = entry.target as HTMLElement

      if (entry.isIntersecting || entry.intersectionRatio > 0) {
        transObjects.forEach(obj => {
          const { range, pNode, trans } = obj
          if (!obj.inserted && pNode === el) {
            const transNode = document.createElement('w-mark-t')
            transNode.textContent = `(${cnRegex.exec(trans)?.[0] ?? trans})`
            transNode.dataset.trans = `(${trans})`
            if (range.endContainer.nextSibling?.nodeName !== 'W-MARK-T') {
              range.insertNode(transNode)
            }
            range.detach()
            obj.inserted = true
            intersectionObserver.unobserve(pNode)
          }
        })
        debounce(() => {
          transObjects = transObjects.filter(obj => !obj.inserted)
        }, 200)
      }
    },
    { rootMargin: '50vh 0 50vh 0', threshold: 0 }
  )
})

const segmenterEn = new Intl.Segmenter('en-US', { granularity: 'word' })
function highlightTextNode(node: CharacterData, dict: WordInfoMap, wordsKnown: WordMap, word?: string) {
  if (node.parentElement?.tagName === 'W-MARK-T') return
  const text = node.nodeValue || ''
  if (!text.trim()) return

  let toHighlightWords = []
  const segments = segmenterEn.segment(text)

  let curNode = node

  for (const segment of segments) {
    const w = segment.segment.toLowerCase()
    if (segment.isWordLike && w in dict) {
      const originFormWord = getOriginForm(w)
      if (!(originFormWord in wordsKnown)) {
        if (word && word !== originFormWord) continue
        const range = new Range()
        range.setStart(curNode, segment.index)
        let endOffset = segment.index + w.length
        range.setEnd(curNode, endOffset)

        const trans = settings().showCnTrans && fullDict[originFormWord]?.t
        if (trans) {
          // avoid duplicated
          if (range.endContainer.nextSibling?.nodeName === 'W-MARK-T') {
            continue
          }

          const newRange = new Range()
          newRange.setStart(curNode, endOffset)
          newRange.collapse(false)

          transObjects.push({
            range: newRange,
            pNode: curNode.parentElement!,
            trans
          })

          intersectionObserver.observe(curNode.parentElement!)
        }

        let sameContainerRanges = highlightContainerMap.get(node.parentElement!) ?? new Set()
        highlightContainerMap.set(node.parentElement!, sameContainerRanges.add(range))

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
  highlightContainerMap = new WeakMap()
}

function observeDomChange() {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'characterData') {
        if (mutation.target.nodeType === Node.TEXT_NODE) {
          if (isTextNodeValid(mutation.target as Text)) {
            highlightTextNode(mutation.target as Text, dict, wordsKnown)
          }
        }
      }
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (!node.isConnected || !node.parentNode?.isConnected) {
            return false
          }
          if (node.nodeType === Node.TEXT_NODE) {
            if (isTextNodeValid(node as Text) && node.nodeValue) {
              highlightTextNode(node as Text, dict, wordsKnown)
            }
          } else {
            if (
              (node as HTMLElement).isContentEditable ||
              node.parentElement?.isContentEditable ||
              node.nodeName?.toUpperCase() === 'W-MARK-T'
            ) {
              return false
            }
            highlight(node)
          }
        })

        // when remove node, remove highlight range
        if (mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach(node => {
            if (highlightContainerMap.has(node)) {
              const ranges = highlightContainerMap.get(node)!
              ranges.forEach(r => {
                unknownHL.delete(r)
                contextHL.delete(r)
              })
              highlightContainerMap.delete(node)
            }
          })

          // for some sites like calibre reader server
          // it uses `document.body.innerHTML` when page changes between book thumb and book contents
          // which will cause word-hunter card node removed
          // we need to clone the removed wh-root node and append to body, to make card work again
          if (mutation.removedNodes[0].nodeName === 'WH-ROOT') {
            const oldWhRoot = mutation.removedNodes[0] as HTMLElement
            const whRoot = oldWhRoot.cloneNode(true)
            oldWhRoot.remove()
            document.body.appendChild(whRoot)
          }
        }
      }
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: false,
    attributes: false
  })
}

function getHighlightCount() {
  const contextWordsSet = new Set()
  const unknownWordSet = new Set()
  unknownHL.forEach(range => {
    const word = getOriginForm(getRangeWord(range))
    unknownWordSet.add(word)
  })
  contextHL.forEach(range => {
    const word = getOriginForm(getRangeWord(range))
    contextWordsSet.add(word)
  })
  return [unknownWordSet.size, contextWordsSet.size]
}

function getPageStatistics() {
  const words = [...(document.body.textContent ?? '').matchAll(/[a-z]+/gi)]
    .map(w => w[0].toLowerCase())
    .filter(w => w in dict)
    .map(w => getOriginForm(w))
  const wordCount = new Set(words).size
  const [unknownCount, haveContextCount] = getHighlightCount()
  return [unknownCount, haveContextCount, wordCount] as const
}

// this function expose to be called in popup page
window.__getPageStatistics = getPageStatistics

window.__updateDicts = () => {
  document.querySelectorAll('w-mark-t').forEach(node => {
    node.remove()
    transObjects = []
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

let isInited = false
export async function init() {
  if (isInited) return
  await readStorageAndHighlight()
  observeDomChange()
  listenBackgroundMessage()
  isInited = true
}
