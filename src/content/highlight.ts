import {
  classes,
  invalidTags,
  invalidSelectors,
  keepTextNodeHosts,
  Messages,
  WordContext,
  ContextMap,
  WordMap,
  WordInfoMap,
  wordRegex,
  wordReplaceRegex,
  StorageKey
} from '../constant'
import { createSignal } from 'solid-js'
import { getDocumentTitle, getFaviconUrl, settings, mergeKnowns, getSelectedDicts } from '../lib'
import { getMessagePort } from '../lib/port'

let wordsKnown: WordMap = {}
let fullDict: WordInfoMap = {}
let dict: WordInfoMap = {}
let contexts: ContextMap = {}
const shouldKeepOriginNode = keepTextNodeHosts.includes(location.hostname)

export const [zenExcludeWords, setZenExcludeWords] = createSignal<string[]>([])
export const [wordContexts, setWordContexts] = createSignal<WordContext[]>([])

function getNodeWord(node: HTMLElement | Node | undefined) {
  if (!node) return ''
  return (node.textContent ?? '').toLowerCase()
}

function isNormalTenseSame(word1: string, word2: string) {
  return word1 === word2 || fullDict[word1]?.o === fullDict[word2]?.o
}

export function markAsKnown(word: string) {
  if (!wordRegex.test(word)) return

  wordsKnown[word] = 'o'
  getMessagePort().postMessage({ action: Messages.set_known, word: word })
}

function _makeAsKnown(word: string) {
  document.querySelectorAll('.' + classes.mark).forEach(node => {
    if (isNormalTenseSame(getNodeWord(node), word)) {
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
  getMessagePort().postMessage({ action: Messages.add_context, word: word, context })
}

function _addContext(context: WordContext) {
  const word = fullDict[context.word].o ?? context.word
  if (!(contexts[word] ?? []).find(c => c.text === context.text)) {
    contexts[word] = [...(contexts[word] ?? []), context]
  }

  setWordContexts(contexts[word])
  document.querySelectorAll('.' + classes.mark).forEach(node => {
    if (isNormalTenseSame(getNodeWord(node), word)) {
      node.setAttribute('have_context', contexts[word].length.toString())
    }
  })
}

export function deleteContext(context: WordContext) {
  getMessagePort().postMessage({ action: Messages.delete_context, word: context.word, context })
}

function _deleteContext(context: WordContext) {
  const word = fullDict[context.word].o ?? context.word
  const index = (contexts[word] ?? []).findIndex(c => c.text === context.text)
  if (index > -1) {
    contexts[word].splice(index, 1)

    setWordContexts([...contexts[word]])
    document.querySelectorAll('.' + classes.mark).forEach(node => {
      if (isNormalTenseSame(getNodeWord(node), word)) {
        if (contexts[word]?.length === 0) {
          node.removeAttribute('have_context')
        } else {
          node.setAttribute('have_context', contexts[word].length.toString())
        }
      }
    })
  }
}

export function markAsAllKnown() {
  const words = Array.from(document.querySelectorAll('.' + classes.unknown))
    .map(node => {
      return getNodeWord(node)
    })
    .filter(word => wordRegex.test(word) && !zenExcludeWords().includes(word))
  getMessagePort().postMessage({ action: Messages.set_all_known, words })
}

function _makeAsAllKnown(words: string[]) {
  const nodes = document.querySelectorAll('.' + classes.unknown)
  nodes.forEach(node => {
    const word = getNodeWord(node)
    if (wordRegex.test(word) && words.includes(word)) {
      node.className = classes.known
    }
  })
}

function getTextNodes(node: Node): CharacterData[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [node as CharacterData]
    // https://johnresig.com/blog/nodename-case-sensitivity/
  } else if (invalidTags.includes(node.nodeName?.toUpperCase())) {
    return []
  }

  const textNodes: CharacterData[] = []
  for (const childNode of node.childNodes) {
    textNodes.push(...getTextNodes(childNode))
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

function highlightTextNode(node: CharacterData, dict: WordInfoMap, wordsKnown: WordMap, contexts: ContextMap) {
  const text = (node.nodeValue || '').replaceAll('>', '&gt;').replaceAll('<', '&lt;')
  const toHighlightWords: string[] = []
  const html = text.replace(wordReplaceRegex, (origin, prefix, word, postfix) => {
    const w = word.toLowerCase()
    if (w in dict) {
      if (w in wordsKnown) {
        return origin
      } else {
        toHighlightWords.push(w)
        const contextLength = getWordContexts(w)?.length ?? 0
        const contextAttr = contextLength > 0 ? `have_context="${contextLength}"` : ''
        const trans = settings().showCnTrans && fullDict[fullDict[w]?.o]?.t
        const transTag = !!trans ? `<w-mark-t data-trans="(${trans})">(${trans})</w-mark-t>` : ''
        return `${prefix}<w-mark tabindex="0" class="${classes.mark} ${classes.unknown}" ${contextAttr} role="button">${word}</w-mark>${transTag}${postfix}`
      }
    } else {
      return origin
    }
  })
  if (text !== html) {
    autoPauseForYoutubeSubTitle(node.parentElement, toHighlightWords)
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
    }
  }
}

function highlight(textNodes: CharacterData[], dict: WordInfoMap, wordsKnown: WordMap, contexts: ContextMap) {
  for (const node of textNodes) {
    // skip if node is already highlighted when re-highlight
    if (node.parentElement?.classList.contains(classes.mark)) continue
    if (invalidTags.includes(node.parentNode?.nodeName?.toUpperCase() ?? '')) {
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
  fullDict = result.dict || (await waitForDictPrepare())
  dict = await getSelectedDicts(fullDict)
  wordsKnown = result[StorageKey.known] || {}
  contexts = result[StorageKey.context] || {}

  const textNodes = getTextNodes(document.body)
  highlight(textNodes, dict, wordsKnown, contexts)
}

function resetHighlight() {
  dict = {}
  document.querySelectorAll('w-mark-t').forEach(node => {
    node.remove()
  })
  document.querySelectorAll('.' + classes.mark_parent).forEach(node => {
    const text = node.textContent ?? ''
    node.replaceWith(document.createTextNode(text))
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
  const selector = isVisible ? `.${classes.unknown}` : `.${classes.unknown}`
  let haveContextCount = 0
  const unknownWords = Array.from(document.querySelectorAll(selector)).map(w => {
    if (w.hasAttribute('have_context')) {
      haveContextCount++
    }
    return (w as HTMLElement).innerText.toLowerCase()
  })
  return [new Set(unknownWords).size, haveContextCount]
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
  return word in dict && !(word in wordsKnown)
}

export function isInDict(word: string) {
  return word?.toLowerCase() in dict
}

export function getWordAllTenses(word: string) {
  const words = Object.entries(fullDict)
    .filter(([_, info]) => info.o === word)
    .map(([w, _]) => w)
  return words
}

export function getWordContexts(word: string) {
  const normalTenseWord = fullDict[word].o ?? word
  return contexts[normalTenseWord] ?? []
}

export async function init() {
  await mergeKnowns()
  await readStorageAndHighlight()
  observeDomChange()
  listenBackgroundMessage()
}
