import {
  classes,
  invalidTags,
  keepTextNodeHosts,
  Messages,
  WordMap,
  wordRegex,
  wordReplaceRegex,
  WordType
} from '../constant'
import { createSignal } from 'solid-js'

let wordsKnown: WordMap = {}
let dict: WordMap = {}
let messagePort: chrome.runtime.Port
const shouldKeepOriginNode = keepTextNodeHosts.includes(location.hostname)

export const [zenExcludeWords, setZenExcludeWords] = createSignal<string[]>([])

function getNodeWord(node: HTMLElement | Node | undefined) {
  if (!node) return ''
  return (node.textContent ?? '').toLowerCase()
}

function connectPort() {
  messagePort = chrome.runtime.connect({ name: 'word-hunter' })
  messagePort.onDisconnect.addListener(() => {
    connectPort()
  })
}

export function markAsKnown(word: string) {
  if (!wordRegex.test(word)) return

  wordsKnown[word] = 0
  messagePort.postMessage({ action: Messages.set_known, word: word })
  document.querySelectorAll('.' + classes.mark).forEach(node => {
    if (getNodeWord(node) === word) {
      node.className = classes.known
    }
  })
}

function markAsAllKnown() {
  const nodes = document.querySelectorAll('.' + classes.unknown)
  const words: string[] = []
  const toMarkedNotes: Element[] = []
  nodes.forEach(node => {
    const word = getNodeWord(node)
    if (wordRegex.test(word) && !zenExcludeWords().includes(word)) {
      words.push(word)
      toMarkedNotes.push(node)
    }
  })

  messagePort.postMessage({ action: Messages.set_all_known, words })
  toMarkedNotes.forEach(node => {
    node.className = classes.known
  })
}

// this function expose to be called in popup page
window.__markAsAllKnown = markAsAllKnown

function getTextNodes(node: Node): CharacterData[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [node as CharacterData]
  } else if (invalidTags.includes(node.nodeName)) {
    return []
  }

  const textNodes: CharacterData[] = []
  for (const childNode of node.childNodes) {
    textNodes.push(...getTextNodes(childNode))
  }
  return textNodes
}

function highlight(textNodes: CharacterData[], dict: WordMap, wordsKnown: WordMap) {
  for (const node of textNodes) {
    // skip if node is already highlighted when re-highlight
    if (node.parentElement?.classList.contains(classes.mark)) continue

    const text = (node.nodeValue || '').replaceAll('>', '&gt;').replaceAll('<', '&lt;')
    const html = text.replace(wordReplaceRegex, (origin, prefix, word, postfix) => {
      const w = word.toLowerCase()
      if (w in dict) {
        if (w in wordsKnown) {
          return origin
        } else {
          return `${prefix}<w-mark class="${classes.mark} ${classes.unknown}">${word}</w-mark>${postfix}`
        }
      } else {
        return origin
      }
    })
    if (text !== html) {
      if (shouldKeepOriginNode) {
        node.parentElement?.insertAdjacentHTML(
          'afterend',
          `<w-mark-parent class="${classes.mark_parent}">${html}</w-mark-parent>`
        )
        // move the origin text node into a isolate node, but don't delete it
        // this is for campatible with some website which use the origin text node always
        const newNode = document.createElement('div')
        newNode.appendChild(node)
      } else {
        const newNode = document.createElement('w-mark-parent')
        newNode.className = classes.mark_parent
        newNode.innerHTML = html
        node.replaceWith(newNode)
      }
    }
  }
}

function readStorageAndHighlight() {
  chrome.storage.local.get(['dict', WordType.known], result => {
    dict = result.dict || {}
    wordsKnown = result[WordType.known] || {}

    const textNodes = getTextNodes(document.body)
    highlight(textNodes, dict, wordsKnown)
  })
}

function observeDomChange() {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (
            !node.isConnected ||
            !node.parentNode?.isConnected ||
            (node as HTMLElement).classList?.contains(classes.mark) ||
            (node as HTMLElement).classList?.contains(classes.mark_parent)
          ) {
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
      }
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  })
}

function getPageStatistics() {
  console.time('getPageStatistics')
  const textNodes = Array.from(getTextNodes(document.body))
  const splitWordReg = /[\s\.,|?|!\(\)\[\]\{\}\/\\]+/
  const words: string[] = []
  textNodes.forEach(node => {
    const textValue = node.nodeValue || ''
    const wordsInText = textValue.split(splitWordReg)
    wordsInText.forEach(w => {
      const word = w.toLowerCase()
      if (word in dict) {
        words.push(word)
      }
    })
  })
  const wordCount = new Set(words).size

  const unknownWords = Array.from(document.querySelectorAll('.' + classes.unknown)).map(w =>
    (w as HTMLElement).innerText.toLowerCase()
  )
  const unknownCount = new Set(unknownWords).size
  console.timeEnd('getPageStatistics')
  return [unknownCount, wordCount] as const
}

// this function expose to be called in popup page
window.__getPageStatistics = getPageStatistics

export function getKnwonWords() {
  return wordsKnown
}

export function isInDict(word: string) {
  return word?.toLowerCase() in dict
}

export function getMessagePort() {
  return messagePort
}

export function init() {
  connectPort()
  readStorageAndHighlight()
  observeDomChange()
}
