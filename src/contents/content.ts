import './content.less'

import { loadingImgDataUri } from '../assets/img'
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
import collins from '../utils/collins'

let curMarkNode: HTMLElement
let curWord = ''
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
    <div id="__word_def"></div>
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

function getNodeWord(node: HTMLElement | Node | undefined) {
  if (!node) return ''
  return (node.textContent ?? '').toLowerCase()
}

async function renderDict(node?: HTMLElement) {
  const dictNode = getCardNode().querySelector('#__word_def')!
  if (!node) {
    dictNode.innerHTML = ''
    return false
  } else {
    const isInCard = dictNode.contains(node)
    dictNode.innerHTML = `<div class="__dict_loading"><img src="${loadingImgDataUri}" alt="loading" /></div>`
    const word = getNodeWord(node)
    try {
      const def = await collins.lookup(word)
      if (word !== curWord) {
        console.info('word changed, skip render', word, curWord)
        return false
      }
      const html = collins.render(def)
      dictNode.innerHTML = html
    } catch (e) {
      console.error(e)
      dictNode.innerHTML = '😭 not found definition'
    }

    if (isInCard) {
      adjustCardPosition(curMarkNode.getBoundingClientRect())
    } else {
      adjustCardPosition(node.getBoundingClientRect())
    }
  }
}

function renderWordContext(node: HTMLElement) {
  const isKnownHalf = node.classList.contains(classes.half)
  const cardNode = getCardNode()
  const contextNode = cardNode.querySelector('#__word_context')!
  const halfButton = cardNode.querySelectorAll('button')![1]
  if (isKnownHalf) {
    const context = wordsHalf[getNodeWord(node)] as WordContext
    contextNode.innerHTML = `
      <div>
        ${emphasizeWordInText(context.text, context.word)}
        <a href="${context.url}" target="_blank"> 🔗</a>
      </div>
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
    cardNode.classList.remove('__card_visible')
    cardNode.classList.add('__card_hidden')
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
  if (!wordRegex.test(curWord)) return

  wordsKnown[curWord!] = 0
  messagePort.postMessage({ action: Messages.set_known, word: curWord })
  document.querySelectorAll('.' + classes.mark).forEach(node => {
    if (getNodeWord(node) === curWord) {
      node.className = classes.known
    }
  })
  hidePopupDelay(0)
}

function markAsKnownHalf() {
  const word = curWord
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
    if (getNodeWord(node) === word) {
      node.classList.remove(classes.unknown)
      node.classList.add(classes.half)
      node.classList.add(classes.mark)
    }
  })
  hidePopupDelay(0)
}

function markAsAllKnown() {
  const nodes = document.querySelectorAll('.' + classes.unknown)
  const words: string[] = []
  nodes.forEach(node => {
    const word = getNodeWord(node)
    if (wordRegex.test(word)) {
      words.push(word)
    }
  })

  messagePort.postMessage({ action: Messages.set_all_known, words })
  nodes.forEach(node => {
    node.className = classes.known
  })
  hidePopupDelay(0)
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
        background-color: ${colors[0]};
      }
      .__word_half {
         color: ${invertHexColor(colors[1])};
        background-color: ${colors[1]};
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
      const word = getNodeWord(node)
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
  timerShowRef && clearTimeout(timerShowRef)
  if (node.classList.contains(classes.mark) || node.classList.contains(classes.card)) {
    hidePopupDelay(500)
  }

  if (node.classList.contains(classes.mark)) {
    node.removeEventListener('mouseleave', hidePopup)
  }
}

function showPopup(node: HTMLElement) {
  const cardNode = getCardNode()
  cardNode.classList.remove('__card_hidden')
  cardNode.classList.add('__card_visible')
  adjustCardPosition(node.getBoundingClientRect())
}

function adjustCardPosition(rect: DOMRect) {
  const cardNode = getCardNode()
  const { x: x, y: y, width: m_width, height: m_height } = rect
  const { width: c_width, height: c_height } = cardNode.getBoundingClientRect()

  let left = x + m_width + 10
  let top = y - 20
  // if overflow right viewport
  if (left + c_width > window.innerWidth) {
    if (x > c_width) {
      left = x - c_width - 5
    } else {
      left = window.innerWidth - c_width - 30
      top = y + m_height + 10
    }
  }
  // if overflow top viewport
  if (top < 0) {
    top = 10
  }

  if (top + c_height > window.innerHeight) {
    top = window.innerHeight - c_height - 10
  }

  cardNode.style.left = `${left}px`
  cardNode.style.top = `${top}px`
}

function bindEvents() {
  document.addEventListener('mouseover', async (e: MouseEvent) => {
    const node = e.target as HTMLElement

    if (node.classList.contains('__mark')) {
      // set current node for popup
      if (document.querySelector('.' + classes.zen_mode)) {
        curMarkNode = (node as any).__shadow
      } else {
        curMarkNode = node
        curWord = getNodeWord(node)
      }

      renderWordContext(node)
      renderDict(node)

      timerShowRef && clearTimeout(timerShowRef)
      timerShowRef = setTimeout(() => {
        showPopup(node)
      }, 200)

      timerHideRef && clearTimeout(timerHideRef)
      node.addEventListener('mouseleave', hidePopup)
    }

    const cardNode = getCardNode()
    if (cardNode === node || cardNode.contains(node)) {
      timerHideRef && clearTimeout(timerHideRef)
    }
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

    const audioSrc = node.getAttribute('data-src-mp3') || node.parentElement?.getAttribute('data-src-mp3')
    if (audioSrc) {
      messagePort.postMessage({ action: Messages.play_audio, audio: audioSrc })
    }

    if (node.tagName === 'A' && node.dataset.href) {
      curWord = getNodeWord(node)
      renderDict(node)
      return false
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

function highlight(textNodes: CharacterData[], dict: Dict, wordsKnown: WordMap, wordsHalf: HalfKnownWordMap) {
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
          return `${prefix}<w-mark class="${classes.mark} ${classes.half}">${word}</w-mark>${postfix}`
        } else {
          return `${prefix}<w-mark class="${classes.mark} ${classes.unknown}">${word}</w-mark>${postfix}`
        }
      } else {
        return origin
      }
    })
    if (text !== html) {
      const newNode = document.createElement('w-mark-parent')
      newNode.className = classes.mark_parent
      newNode.innerHTML = html
      node.parentNode?.replaceChild(newNode, node)
    }
  }
}

function readStorageAndHighlight() {
  chrome.storage.local.get(['dict', WordType.known, WordType.half], result => {
    dict = result.dict || {}
    wordsKnown = result[WordType.known] || {}
    wordsHalf = result[WordType.half] || {}

    const textNodes = getTextNodes(document.body)
    highlight(textNodes, dict, wordsKnown, wordsHalf)
  })
}

function observeDomChange() {
  const cardNode = getCardNode()
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            highlight([node as CharacterData], dict, wordsKnown, wordsHalf)
          } else {
            if (
              (node as HTMLElement).classList?.contains(classes.mark) ||
              (node as HTMLElement).classList?.contains(classes.mark_parent) ||
              cardNode.contains(node)
            ) {
              return false
            }
            const textNodes = getTextNodes(node)
            highlight(textNodes, dict, wordsKnown, wordsHalf)
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

function init() {
  connectPort()
  setColorStyle()
  readStorageAndHighlight()
  bindEvents()
  observeDomChange()
}

init()
