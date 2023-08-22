import {
  classes,
  invalidTags,
  invalidSelectors,
  keepTextNodeHosts,
  Messages,
  WordContext,
  ContextMap,
  WordMap,
  wordRegex,
  wordReplaceRegex,
  StorageKey
} from '../constant'
import { createSignal } from 'solid-js'
import { getDocumentTitle, getFaviconUrl, settings, mergeKnowns } from '../lib'
import { getMessagePort } from '../lib/port'

let wordsKnown: WordMap = {}
let dict: WordMap = {}
let contexts: ContextMap = {}
const shouldKeepOriginNode = keepTextNodeHosts.includes(location.hostname)

export const [zenExcludeWords, setZenExcludeWords] = createSignal<string[]>([])
export const [wordContexts, setWordContexts] = createSignal<WordContext[]>([])

function getNodeWord(node: HTMLElement | Node | undefined) {
  if (!node) return ''
  return (node.textContent ?? '').toLowerCase()
}

export function markAsKnown(word: string) {
  if (!wordRegex.test(word)) return

  wordsKnown[word] = 0
  getMessagePort().postMessage({ action: Messages.set_known, word: word })
  document.querySelectorAll('.' + classes.mark).forEach(node => {
    if (getNodeWord(node) === word) {
      node.className = classes.known
    }
  })
}

export function addContext(word: string, text: string) {
  if (!wordRegex.test(word)) return

  const context: WordContext = {
    url: location.href,
    title: getDocumentTitle(),
    text: text,
    word: word,
    timestamp: Date.now(),
    favicon: getFaviconUrl()
  }

  if (!(contexts[word] ?? []).find(c => c.text === context.text)) {
    contexts[word] = [...(contexts[word] ?? []), context]
  }

  getMessagePort().postMessage({ action: Messages.add_context, word: word, context })
  setWordContexts(contexts[word])
  document.querySelectorAll('.' + classes.mark).forEach(node => {
    if (getNodeWord(node) === word) {
      node.setAttribute('have_context', contexts[word].length.toString())
    }
  })
}

export function deleteContext(context: WordContext) {
  getMessagePort().postMessage({ action: Messages.delete_context, word: context.word, context })

  const index = (contexts[context.word] ?? []).findIndex(c => c.text === context.text)
  if (index > -1) {
    contexts[context.word].splice(index, 1)

    setWordContexts([...contexts[context.word]])
    document.querySelectorAll('.' + classes.mark).forEach(node => {
      if (getNodeWord(node) === context.word) {
        if (contexts[context.word]?.length === 0) {
          node.removeAttribute('have_context')
        } else {
          node.setAttribute('have_context', contexts[context.word].length.toString())
        }
      }
    })
  }
}

export function markAsAllKnown() {
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

  getMessagePort().postMessage({ action: Messages.set_all_known, words })
  toMarkedNotes.forEach(node => {
    node.className = classes.known
  })
}

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

const intersectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const el = entry.target as HTMLElement
    if (entry.isIntersecting) {
      if (getHighlightCount(true) > settings()['maxHighlight']) {
        return
      }
      el.classList.add(classes.in_viewport)
    } else {
      el.classList.remove(classes.in_viewport)
    }
  })
})

function highlightTextNode(node: CharacterData, dict: WordMap, wordsKnown: WordMap, contexts: ContextMap) {
  const text = (node.nodeValue || '').replaceAll('>', '&gt;').replaceAll('<', '&lt;')
  const html = text.replace(wordReplaceRegex, (origin, prefix, word, postfix) => {
    const w = word.toLowerCase()
    if (w in dict) {
      if (w in wordsKnown) {
        return origin
      } else {
        const contextAttr = contexts[w]?.length > 0 ? `have_context="${contexts[w]?.length}"` : ''
        return `${prefix}<w-mark tabindex="0" class="${classes.mark} ${classes.unknown}" ${contextAttr} role="button">${word}</w-mark>${postfix}`
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
      // this is for compatible with some website which use the origin text node always
      const newNode = document.createElement('div')
      newNode.appendChild(node)
    } else {
      const newNode = document.createElement('w-mark-parent')
      newNode.className = classes.mark_parent
      newNode.innerHTML = html
      node.replaceWith(newNode)

      // check if element is in viewport
      const marks = newNode.querySelectorAll('.' + classes.mark)
      marks.forEach(mark => {
        intersectionObserver.observe(mark)
      })
    }
  }
}

function highlight(textNodes: CharacterData[], dict: WordMap, wordsKnown: WordMap, contexts: ContextMap) {
  for (const node of textNodes) {
    // skip if node is already highlighted when re-highlight
    if (node.parentElement?.classList.contains(classes.mark)) continue
    if (invalidTags.includes(node.parentNode?.nodeName ?? '')) {
      continue
    }

    for (const selector of invalidSelectors) {
      if (node.parentElement?.closest(selector)) {
        return
      }
    }

    highlightTextNode(node, dict, wordsKnown, contexts)
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
  const result = await chrome.storage.local.get(['dict', StorageKey.known, StorageKey.context])
  dict = result.dict || (await waitForDictPrepare())
  wordsKnown = result[StorageKey.known] || {}
  contexts = result[StorageKey.context] || {}

  const textNodes = getTextNodes(document.body)
  highlight(textNodes, dict, wordsKnown, contexts)
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
            highlight([node as CharacterData], dict, wordsKnown, contexts)
          } else {
            if ((node as HTMLElement).isContentEditable || node.parentElement?.isContentEditable) {
              return false
            }
            const textNodes = getTextNodes(node)
            highlight(textNodes, dict, wordsKnown, contexts)
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

function getHighlightCount(isVisible?: boolean) {
  const selector = isVisible ? `.${classes.unknown}.${classes.in_viewport}` : `.${classes.unknown}`
  const unknownWords = Array.from(document.querySelectorAll(selector)).map(w =>
    (w as HTMLElement).innerText.toLowerCase()
  )
  return new Set(unknownWords).size
}

function getPageStatistics() {
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
  const unknownCount = getHighlightCount()
  return [unknownCount, wordCount] as const
}

// this function expose to be called in popup page
window.__getPageStatistics = getPageStatistics

export function isWordKnownAble(word: string) {
  return word in dict && !(word in wordsKnown)
}

export function isInDict(word: string) {
  return word?.toLowerCase() in dict
}

export function getWordContexts(word: string) {
  return contexts[word] ?? []
}

export async function init() {
  await mergeKnowns()
  await readStorageAndHighlight()
  observeDomChange()
}
