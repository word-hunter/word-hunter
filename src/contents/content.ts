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
import { emphasizeWordInText, getFaviconUrl, invertHexColor } from '../utils'

let curMarkNode: HTMLElement
let timerShowRef: ReturnType<typeof setTimeout>
let timerHideRef: ReturnType<typeof setTimeout>
let wordsKnown: WordMap = {}
let wordsHalf: HalfKnownWordMap = {}
let dict: Dict = {}
let messagePort: chrome.runtime.Port

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

function renderWordContext(context?: WordContext) {
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
  const cardNode = getCardNode()
  timerHideRef = setTimeout(() => {
    cardNode.style.visibility = 'hidden'
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
    const result = preContent + word + postContent
    return result.length > 300 ? word : result
  }
  return context
}

function connectPort() {
  messagePort = chrome.runtime.connect({ name: 'word-hunter' })
  messagePort.onDisconnect.addListener(() => {
    connectPort()
  })
}

function markAsKnown() {
  const word = curMarkNode?.textContent?.toLowerCase() || ''
  if (!wordRegex.test(word)) return

  wordsKnown[word!] = 0
  messagePort.postMessage({ action: Messages.set_known, word })
  document.querySelectorAll('.' + classes.mark).forEach(node => {
    if (node.textContent?.toLowerCase() === word) {
      node.className = classes.known
    }
  })
  hidePopupDelay(0)
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

  messagePort.postMessage({ action: Messages.set_known_half, word, context })
  document.querySelectorAll('.' + classes.unknown).forEach(node => {
    if (node.textContent?.toLowerCase() === word) {
      node.classList.remove(classes.unknown)
      node.classList.add(classes.half)
      node.classList.add(classes.mark)
    }
  })
  hidePopupDelay(100)
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

  messagePort.postMessage({ action: Messages.set_all_known, words })
  nodes.forEach(node => {
    node.className = classes.known
  })
  hidePopupDelay(100)
}

// this function expose to be called in popup page
window.__markAsAllKnown = markAsAllKnown

function setColorStyle() {
  chrome.storage.local.get('colors', result => {
    const colors = result.colors || defaultColors
    const styleNode = getCardNode().querySelector('style')!
    styleNode.textContent = `
      .__word_unknown {
        color: ${invertHexColor(colors[0])};
        background: ${colors[0]};
      }
      .__word_half {
         color: ${invertHexColor(colors[1])};
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
      ;(nodeCopy as any).__shadow = node
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
    node.removeEventListener('mouseleave', hidePopup)
  }
}

function showPopup(node: HTMLElement) {
  const isKnownHalf = node.classList.contains(classes.half)
  if (isKnownHalf) {
    const context = wordsHalf[node.textContent!.toLowerCase()] as WordContext
    renderWordContext(context)
  } else {
    renderWordContext(undefined)
  }

  const cardNode = getCardNode()
  cardNode.style.visibility = 'visible'
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
  if (document.querySelector('.' + classes.zen_mode)) {
    curMarkNode = (node as any).__shadow
  } else {
    curMarkNode = node
  }
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

function highlight(dict: Dict, wordsKnown: WordMap, wordsHalf: HalfKnownWordMap) {
  const textNodes = getTextNodes(document.body)
  for (const node of textNodes) {
    // skip if node is already highlighted when re-highlight
    if (node.parentElement?.classList.contains(classes.mark)) continue

    const text = (node.nodeValue || '').replaceAll('>', '&gt;').replaceAll('<', '&lt;')
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

function reHighlight() {
  highlight(dict, wordsKnown, wordsHalf)
}

// this function expose to be called in popup page
window.__reHighlight = reHighlight

function readStorageAndHighlight() {
  chrome.storage.local.get(['dict'], result => {
    dict = result.dict || {}
    chrome.storage.local.get([WordType.known, WordType.half], result => {
      wordsKnown = result[WordType.known] || {}
      wordsHalf = result[WordType.half] || {}
      setTimeout(() => {
        highlight(dict, wordsKnown, wordsHalf)
        // many web pages client hydration after dom loaded, it will override our highlight
        // so, we need to delay awhile for highlight
      }, 300)
    })
  })
}

function init() {
  connectPort()
  setColorStyle()
  readStorageAndHighlight()
  bindEvents()
}

init()
