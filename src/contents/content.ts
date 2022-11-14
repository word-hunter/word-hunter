import './content.less'

import {
  classes,
  defaultColors,
  Dict,
  HalfKnownWordMap,
  invalidTags,
  Messages,
  WordContext,
  WordMap,
  wordRegex,
  wordReplaceRegex,
  WordType
} from '../constant'
import { emphasizeWordInText, getFaviconUrl } from '../utils'

let curMarkNode: HTMLElement
let timerShowRef: NodeJS.Timeout
let timerHideRef: NodeJS.Timeout
let wordsKnown: WordMap = {}
let wordsHalf: HalfKnownWordMap = {}

function createCardNode() {
  const cardNode = document.createElement('div')
  cardNode.className = classes.card
  cardNode.innerHTML = `
    <div id="__word_context"></div>
    <div class="__buttons_container">
      <button data-class="${classes.known}">😀 known</button>
      <button data-class="${classes.half}">🙁 known a little</button>
      <style></style>
     </div>`
  document.body.appendChild(cardNode)
  return cardNode
}

// node reference is not stable in github page, so we need to get it every time
function getCardNode() {
  return (document.querySelector('.' + classes.card) as HTMLElement) || createCardNode()
}

function renderWrodContext(context?: WordContext) {
  const cardNode = getCardNode()
  const contextNode = cardNode.querySelector('#__word_context')!
  const halfButton = cardNode.querySelectorAll('button')![1]
  if (context) {
    contextNode.innerHTML = `
      <div>${emphasizeWordInText(context.text, context.word, 'mark')}</div>
      <div>
        <a href="${context.url}" target="_blank">${context.url}</a>
      </div>
      <hr />
    `
    halfButton.style.display = 'none'
  } else {
    contextNode.innerHTML = ''
    halfButton.style.display = 'unset'
  }
}

function hidePopupDelay(ms: number) {
  timerHideRef && clearTimeout(timerHideRef)
  timerHideRef = setTimeout(() => {
    const cardNode = getCardNode()
    cardNode.style.display = 'none'
  }, ms)
}

function getWordTextContent(node: HTMLElement) {
  const word = node.textContent!
  const contextNode = node.parentNode?.parentNode?.nodeName === 'P' ? node.parentNode?.parentNode : node.parentNode
  const context = contextNode?.textContent || ''
  if (context.length > 300) {
    const fragement = context.split(word)
    const preSentences = fragement[0].split('.')
    const postSentences = fragement[1].split('.')
    const preContent = preSentences.length > 1 ? preSentences[preSentences.length - 1] : preSentences[0]
    const postContent = postSentences.length > 1 ? postSentences[0] + '.' : postSentences[0]
    return preContent + word + postContent
  }
  return context
}

function markAsKnown() {
  const word = curMarkNode?.textContent?.toLowerCase() || ''
  if (!wordRegex.test(word)) return

  wordsKnown[word!] = 0
  chrome.runtime.sendMessage({ action: Messages.set_known, word }, response => {
    console.log(response)
    if (response === true) {
      document.querySelectorAll('.' + classes.mark).forEach(node => {
        if (node.textContent?.toLowerCase() === word) {
          node.className = classes.known
        }
      })
      hidePopupDelay(100)
    }
  })
}

function markAsKnownHalf() {
  const word = curMarkNode?.textContent?.toLowerCase() || ''
  if (!wordRegex.test(word)) return

  const context: WordContext = {
    url: location.href,
    text: getWordTextContent(curMarkNode),
    word: word,
    timestamp: Date.now(),
    favicon: getFaviconUrl()
  }
  wordsHalf[word] = context

  chrome.runtime.sendMessage({ action: Messages.set_known_half, word, context }, response => {
    console.log(response)
    if (response === true) {
      document.querySelectorAll('.' + classes.unknown).forEach(node => {
        if (node.textContent?.toLowerCase() === word) {
          node.classList.remove(classes.unknown)
          node.classList.add(classes.half)
          node.classList.add(classes.mark)
        }
      })
      hidePopupDelay(100)
    }
  })
}

function markAsAllKnown() {
  const nodes = document.querySelectorAll('.' + classes.unknown)
  const words: string[] = []
  nodes.forEach(node => {
    const word = node.textContent!.toLowerCase()
    if (wordRegex.test(word)) {
      words.push(word)
    }
  })

  chrome.runtime.sendMessage({ action: Messages.set_all_known, words }, response => {
    console.log(response)
    if (response === true) {
      nodes.forEach(node => {
        node.className = classes.known
      })
      hidePopupDelay(100)
    }
  })
}

// this function expose to be called in popup page
window.__markAsAllKnown = markAsAllKnown

function setColorStyle() {
  chrome.storage.local.get('colors', result => {
    const colors = result.colors || defaultColors
    const styleNode = getCardNode().querySelector('style')!
    styleNode.textContent = `
      .__word_unknown {
        background: ${colors[0]};
      }
      .__word_half {
        background: ${colors[1]};
      }
    `
  })
}

// this function expose to be called in popup page
window.__setColorStyle = setColorStyle

function toggleZenMode() {
  let zenModeNode = document.querySelector('.' + classes.zen_mode) as HTMLElement
  if (!zenModeNode) {
    zenModeNode = document.createElement('div')
    zenModeNode.className = classes.zen_mode
    const wordCache = {}
    document.querySelectorAll('.' + classes.mark).forEach(node => {
      const word = node.textContent!.toLowerCase()
      if (wordCache[word]) return
      const nodeCopy = node.cloneNode(true) as HTMLElement
      zenModeNode.appendChild(nodeCopy)
      wordCache[word] = true
    })
    document.body.appendChild(zenModeNode)
  } else {
    zenModeNode.remove()
  }
}

// this function expose to be called in popup page
window.__toggleZenMode = toggleZenMode

function hidePopup(e: Event) {
  const node = e.target as HTMLElement
  if (node.classList.contains(classes.mark) || node.classList.contains(classes.card)) {
    hidePopupDelay(500)
  }

  if (node.classList.contains(classes.mark)) {
    timerShowRef && clearTimeout(timerShowRef)
    node.removeEventListener('moveleave', hidePopup)
  }
}

function showPopup(node: HTMLElement) {
  const isKnownHalf = node.classList.contains(classes.half)
  if (isKnownHalf) {
    const context = wordsHalf[node.textContent!.toLowerCase()] as WordContext
    renderWrodContext(context)
  } else {
    renderWrodContext(undefined)
  }

  const cardNode = getCardNode()
  cardNode.style.display = 'block'
  const { x: x, y: y, height: n_height } = node.getBoundingClientRect()
  const { width: width, height: height } = cardNode.getBoundingClientRect()

  let left = x - 10
  let top = y - height - 5
  // if overflow right viewport
  if (left + width > window.innerWidth) {
    left = window.innerWidth - width - 30 // 30 px from right (include scrollbar)
  }
  // if overflow top viewport
  if (top - height < 0) {
    top = y + n_height + 10 // bottom of word
  }

  cardNode.style.left = `${left}px`
  cardNode.style.top = `${top}px`

  // set current node for popup
  curMarkNode = node
}

function bindEvents() {
  document.addEventListener('mouseover', (e: MouseEvent) => {
    const node = e.target as HTMLElement
    if (node.classList.contains('__mark')) {
      timerShowRef && clearTimeout(timerShowRef)
      timerShowRef = setTimeout(() => {
        showPopup(node)
      }, 200)
    }

    if (node.classList.contains(classes.card) || node.classList.contains(classes.mark)) {
      timerHideRef && clearTimeout(timerHideRef)
    }

    node.addEventListener('mouseleave', hidePopup)
  })

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.querySelector('.' + classes.zen_mode)) {
        toggleZenMode()
      }
    }
  })

  const cardNode = getCardNode()
  cardNode.addEventListener('click', e => {
    const node = e.target as HTMLElement
    if (node.tagName === 'BUTTON') {
      if (node.dataset.class === classes.known) {
        markAsKnown()
      } else if (node.dataset.class === classes.half) {
        markAsKnownHalf()
      }
    }
  })

  cardNode.addEventListener('mouseleave', hidePopup)
}

function getTextNodes(node: Node): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [node]
  } else if (invalidTags.includes(node.nodeName)) {
    return []
  }

  const textNodes: Node[] = []
  for (const childNode of node.childNodes) {
    textNodes.push(...getTextNodes(childNode))
  }
  return textNodes
}

function highlight(dict: Dict, wordsKnown: WordMap, wordsHalf: HalfKnownWordMap) {
  const textNodes = getTextNodes(document.body)
  for (const node of textNodes) {
    const text = node.nodeValue || ''
    const html = text.replace(wordReplaceRegex, (origin, prefix, word, postfix) => {
      const w = word.toLowerCase()
      if (w in dict) {
        if (w in wordsKnown) {
          return origin
        } else if (w in wordsHalf) {
          return `${prefix}<mark class="${classes.mark} ${classes.half}">${word}</mark>${postfix}`
        } else {
          return `${prefix}<mark class="${classes.mark} ${classes.unknown}">${word}</mark>${postfix}`
        }
      } else {
        return origin
      }
    })
    if (text !== html) {
      const newNode = document.createElement('span')
      newNode.className = '__mark_parent'
      newNode.innerHTML = html
      node.parentNode?.replaceChild(newNode, node)
    }
  }
}

function readStorageAndHighlight() {
  chrome.storage.local.get(['dict'], result => {
    const dict: Dict = result.dict || {}
    chrome.storage.local.get([WordType.known, WordType.half], result => {
      wordsKnown = result[WordType.known] || {}
      wordsHalf = result[WordType.half] || {}
      setTimeout(() => {
        highlight(dict, wordsKnown, wordsHalf)
        // many web pages client hydration after dom loaded, it will override our highlight
        // so we need to delay a while to highlight
      }, 300)
    })
  })
}

function init() {
  setColorStyle()
  readStorageAndHighlight()
  bindEvents()
}

init()
