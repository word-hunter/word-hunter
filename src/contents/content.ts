import './content.less'

import { loadingImgDataUri } from '../assets/img'
import {
  classes,
  defaultColors,
  Dict,
  invalidTags,
  Messages,
  WordMap,
  wordRegex,
  wordReplaceRegex,
  WordType
} from '../constant'
import { invertHexColor } from '../utils'
import collins from '../utils/collins'

let curWord = ''
let timerShowRef: number
let timerHideRef: number
let wordsKnown: WordMap = {}
let dict: Dict = {}
let messagePort: chrome.runtime.Port
let zenExcludeWords: string[] = []
let dictHistory: string[] = []
let inDirecting = false

function createCardNode() {
  const cardNode = document.createElement('div')
  cardNode.className = classes.card
  cardNode.innerHTML = `
    <div class="__buttons_container">
      <button data-class="${classes.known}" disabled>😀 known</button>
      <span></span>
      <a class="__btn-back disabled" title="back">
        <i class="i-history-back"></i>
      </a>
      <style></style>
    </div>
    <div id="__word_def"></div>
     `
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

function setDictHistory(words: string[]) {
  const cardNode = getCardNode()
  const historyNode = cardNode.querySelector('.__btn-back')!
  dictHistory = words
  if (dictHistory.length > 1) {
    historyNode.classList.remove('disabled')
  } else {
    historyNode.classList.add('disabled')
  }
}

async function renderDict(word: string) {
  const cardNode = getCardNode()
  const dictNode = cardNode.querySelector('#__word_def')!
  const titleNode = cardNode.querySelector('span')! as HTMLElement
  titleNode.textContent = word

  if (!word) {
    dictNode.innerHTML = ''
    return false
  } else {
    const knownBtn = cardNode.querySelector('button')! as HTMLButtonElement
    if (word in wordsKnown) {
      knownBtn.setAttribute('disabled', 'disabled')
    } else {
      knownBtn.removeAttribute('disabled')
    }
    dictNode.innerHTML = `<div class="__dict_loading"><img src="${loadingImgDataUri}" alt="loading" /></div>`
    try {
      const def = await collins.lookup(word)
      if (word !== curWord) {
        console.info('word changed, skip render', word, curWord)
        return false
      }
      const html = collins.render(def)
      dictNode.innerHTML = html
    } catch (e) {
      console.warn(e)
      dictNode.innerHTML = '😭 not found definition'
    }
  }
}

function hidePopupDelay(ms: number) {
  clearTimerHideRef()
  const cardNode = getCardNode()
  timerHideRef = window.setTimeout(() => {
    cardNode.classList.remove('__card_visible')
    cardNode.classList.add('__card_hidden')
    setDictHistory([])
  }, ms)
}

function clearTimerHideRef() {
  timerHideRef && clearTimeout(timerHideRef)
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

function markAsAllKnown() {
  const nodes = document.querySelectorAll('.' + classes.unknown)
  const words: string[] = []
  const toMarkedNotes: Element[] = []
  nodes.forEach(node => {
    const word = getNodeWord(node)
    if (wordRegex.test(word) && !zenExcludeWords.includes(word)) {
      words.push(word)
      toMarkedNotes.push(node)
    }
  })

  messagePort.postMessage({ action: Messages.set_all_known, words })
  toMarkedNotes.forEach(node => {
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

    zenExcludeWords = []
    zenModeNode.addEventListener('click', e => {
      const node = e.target as HTMLElement
      if ((e.metaKey || e.ctrlKey) && node.classList.contains(classes.unknown)) {
        if (node.classList.contains(classes.excluded)) {
          zenExcludeWords = zenExcludeWords.filter(w => w !== curWord)
        } else {
          zenExcludeWords.push(getNodeWord(node))
        }
        node.classList.toggle(classes.excluded)
      }
    })
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

function showPopup() {
  const cardNode = getCardNode()
  cardNode.classList.remove('__card_hidden')
  cardNode.classList.add('__card_visible')
}

function adjustCardPosition(rect: DOMRect, onlyOutsideViewport = false) {
  const cardNode = getCardNode()
  const { x: x, y: y, width: m_width, height: m_height } = rect
  const { x: c_x, y: c_y, width: c_width, height: c_height } = cardNode.getBoundingClientRect()

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

  if (!onlyOutsideViewport || c_y < 0 || c_y + c_height > window.innerHeight) {
    cardNode.style.top = `${top}px`
  }

  if (!onlyOutsideViewport || c_x < 0 || c_x + c_width > window.innerWidth) {
    cardNode.style.left = `${left}px`
  }
}

function bindEvents() {
  document.addEventListener('mouseover', async (e: MouseEvent) => {
    const node = e.target as HTMLElement
    const cardNode = getCardNode()

    if (node.classList.contains('__mark')) {
      // skip when redirecting in card dictnary
      if (inDirecting) {
        inDirecting = false
        return false
      }
      curWord = getNodeWord(node)

      const rect = node.getBoundingClientRect()
      adjustCardPosition(rect)
      renderDict(curWord).then(() => {
        adjustCardPosition(rect)
      })
      setDictHistory([curWord])

      timerShowRef && clearTimeout(timerShowRef)
      timerShowRef = window.setTimeout(() => {
        showPopup()
      }, 200)

      clearTimerHideRef()
      node.addEventListener('mouseleave', hidePopup)
    }

    if (cardNode === node || cardNode.contains(node)) {
      clearTimerHideRef()
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
        return false
      }
    }

    const audioSrc = node.getAttribute('data-src-mp3') || node.parentElement?.getAttribute('data-src-mp3')
    if (audioSrc) {
      messagePort.postMessage({ action: Messages.play_audio, audio: audioSrc })
      return false
    }

    if (node.tagName === 'A' && node.dataset.href) {
      curWord = getNodeWord(node)
      inDirecting = true
      const rect = node.getBoundingClientRect()
      renderDict(curWord).then(() => {
        adjustCardPosition(rect, true)
        inDirecting = false
      })
      setDictHistory([...dictHistory, curWord])
      return false
    }

    if (node.classList.contains('__btn-back') || node.parentElement?.classList.contains('__btn-back')) {
      dictHistory.pop()
      setDictHistory(dictHistory)
      const prevWord = dictHistory[dictHistory.length - 1]
      if (prevWord) {
        curWord = prevWord
        inDirecting = true
        const rect = node.getBoundingClientRect()
        prevWord &&
          renderDict(prevWord).then(() => {
            adjustCardPosition(rect, true)
            inDirecting = false
          })
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

function highlight(textNodes: CharacterData[], dict: Dict, wordsKnown: WordMap) {
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
      const newNode = document.createElement('w-mark-parent')
      newNode.className = classes.mark_parent
      newNode.innerHTML = html
      node.parentNode?.replaceChild(newNode, node)
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
  const cardNode = getCardNode()
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (
            (node as HTMLElement).classList?.contains(classes.mark) ||
            (node as HTMLElement).classList?.contains(classes.mark_parent) ||
            cardNode.contains(node)
          ) {
            return false
          }
          if (node.nodeType === Node.TEXT_NODE) {
            highlight([node as CharacterData], dict, wordsKnown)
          } else {
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

function init() {
  connectPort()
  setColorStyle()
  readStorageAndHighlight()
  bindEvents()
  observeDomChange()
}

init()
