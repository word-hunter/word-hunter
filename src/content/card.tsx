import { reloadElement, ICustomElement } from 'component-register'
import { walk } from '../utils/_hot'

import './index.less'
import cardStyles from './card.less?inline'
import { createSignal, Show, For, batch, onMount } from 'solid-js'
import { customElement } from 'solid-element'
import { classes, Messages, WordContext } from '../constant'
import {
  init as highlightInit,
  markAsKnown,
  markAsAllKnown,
  addContext,
  deleteContext,
  isInDict,
  getWordContexts,
  wordContexts,
  setWordContexts,
  getMessagePort,
  isWordKnownAble,
  zenExcludeWords,
  setZenExcludeWords
} from './highlight'
import { Dict } from './dict'
import { adapters } from './adapters'
import { getWordContext, safeEmphasizeWordInText, getFaviconByDomain } from '../utils'
import { readBlacklist } from '../utils/blacklist'

let timerShowRef: number
let timerHideRef: number
let inDirecting = false
let rect: DOMRect

const [curWord, setCurWord] = createSignal('')
const [dictHistory, setDictHistory] = createSignal<string[]>([])
const [zenMode, setZenMode] = createSignal(false)
const [zenModeWords, setZenModeWords] = createSignal<string[]>([])
const [curContextText, setCurContextText] = createSignal('')

export const WhCard = customElement('wh-card', () => {
  const dictAdapter = adapters['collins']

  onMount(() => {
    readBlacklist().then(blacklist => {
      if (blacklist.includes(location.host)) return
      highlightInit()
      bindEvents()
    })
  })

  const onKnown = (e: MouseEvent) => {
    e.preventDefault()
    const word = curWord()
    markAsKnown(word)
    setCurWord('')
    hidePopupDelay(0)
  }

  const onAddContext = (e: MouseEvent) => {
    if (zenMode()) return false
    e.preventDefault()
    const word = curWord()
    addContext(word, curContextText())
  }

  const onCardClick = (e: MouseEvent) => {
    const node = e.target as HTMLElement
    const audioSrc = node.getAttribute('data-src-mp3') || node.parentElement?.getAttribute('data-src-mp3')
    if (audioSrc) {
      e.stopImmediatePropagation()
      getMessagePort().postMessage({ action: Messages.play_audio, audio: audioSrc })
      return false
    }

    if (node.tagName === 'A' && node.dataset.href) {
      e.stopImmediatePropagation()
      const word = dictAdapter.getWordByHref(node.dataset.href)
      if (word === curWord()) return false

      inDirecting = true
      setCurWord(word)
      setDictHistory([...dictHistory(), word])
      return false
    }

    if (node.classList.contains('history_back') || node.parentElement?.classList.contains('history_back')) {
      e.stopImmediatePropagation()
      inDirecting = true
      const newHistory = dictHistory().slice(0, -1)
      setDictHistory(newHistory)
      const prevWord = newHistory.at(-1)
      if (prevWord) {
        setCurWord(prevWord)
      }
    }
  }

  const onCardDoubleClick = (e: MouseEvent) => {
    const selection = document.getSelection()
    const word = selection?.toString().trim().toLowerCase()
    if (word && isInDict(word) && word !== curWord()) {
      setCurWord(word)
      setDictHistory([...dictHistory(), word])
    }
  }

  const onDictSettle = () => {
    adjustCardPosition(rect, inDirecting)
    inDirecting = false
  }

  const inWordContexts = () => {
    return !!wordContexts().find(c => c.text === curContextText())
  }

  const goYouGlish = () => {
    const word = curWord()
    if (word) {
      getMessagePort().postMessage({ action: Messages.open_youglish, word })
    }
  }

  return (
    <div class="word_card" onclick={onCardClick} onmouseleave={hidePopup} ondblclick={onCardDoubleClick}>
      <div class="toolbar">
        <div>
          <button data-class={classes.known} disabled={!isWordKnownAble(curWord())} onclick={onKnown} title="known">
            <img src={chrome.runtime.getURL('icons/checkmark.png')} alt="ok" />
          </button>
          <Show when={dictHistory().length <= 1}>
            <button onclick={onAddContext} disabled={inWordContexts()} title="save context">
              <img src={chrome.runtime.getURL(!inWordContexts() ? 'icons/save.png' : 'icons/saved.png')} alt="save" />
            </button>
          </Show>
        </div>
        <div>
          <a target="_blank" href={`https://www.collinsdictionary.com/dictionary/english/${curWord()}`}>
            {curWord()}
          </a>
        </div>
        <div>
          <a onClick={goYouGlish} title="youglish">
            <img src={chrome.runtime.getURL('icons/youtube-play.png')} alt="youglish" />
          </a>
          <a classList={{ history_back: true, disabled: dictHistory().length < 2 }} title="back">
            <img src={chrome.runtime.getURL('icons/undo.png')} alt="back" />
          </a>
        </div>
      </div>
      <div class="dict_container">
        <Show when={curWord()}>
          <ContextList contexts={wordContexts()}></ContextList>
          <Dict word={curWord()} dictAdapter={dictAdapter} onSettle={onDictSettle} />
        </Show>
      </div>
      <style>{cardStyles}</style>
      <style>{dictAdapter.style}</style>
    </div>
  )
})

export function ZenMode() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && zenMode()) {
      toggleZenMode()
    }
  })

  const onWordClick = (e: MouseEvent) => {
    const node = e.target as HTMLElement
    if (e.metaKey || e.ctrlKey) {
      if (zenExcludeWords().includes(getNodeWord(node))) {
        setZenExcludeWords(zenExcludeWords().filter(w => w !== curWord()))
      } else {
        setZenExcludeWords([...zenExcludeWords(), getNodeWord(node)])
      }
    }
  }

  const onSetAllKnown = () => {
    confirm('Are you sure you want to mark all unknown words on this page as known?') && markAsAllKnown()
  }

  return (
    <Show when={zenMode()}>
      <div class={classes.zen_mode}>
        <pre>
          <p>
            Note: use <kbd>⌘</kbd> + <kbd>Click</kbd> to unselect word
          </p>
        </pre>
        <div class="zen_buttons">
          <button onclick={onSetAllKnown}>Set all words as known</button>
        </div>
        <div class="zen_words">
          <For each={zenModeWords()}>
            {(word: string) => {
              return (
                <span classList={{ [classes.excluded]: zenExcludeWords().includes(word) }} onclick={onWordClick}>
                  {word}
                </span>
              )
            }}
          </For>
        </div>
      </div>
    </Show>
  )
}

function ContextList(props: { contexts: WordContext[] }) {
  return (
    <div class="contexts">
      <For each={props.contexts.reverse()}>
        {(context: WordContext) => {
          return (
            <div>
              <div innerHTML={safeEmphasizeWordInText(context.text, curWord())}></div>
              <p>
                <img src={context.favicon || getFaviconByDomain(context.url)} alt="favicon" />
                <a href={context.url} target="_blank">
                  {context.title}
                </a>
              </p>
              <button title="delete context" onclick={() => deleteContext(context)}>
                <img src={chrome.runtime.getURL('icons/delete.png')} alt="delete" />
              </button>
            </div>
          )
        }}
      </For>
    </div>
  )
}

function getCardNode() {
  const root = document.querySelector('wh-card')?.shadowRoot
  return root?.querySelector('.' + classes.card) as HTMLElement
}

function getNodeWord(node: HTMLElement | Node | undefined) {
  if (!node) return ''
  return (node.textContent ?? '').toLowerCase()
}

function hidePopupDelay(ms: number) {
  clearTimerHideRef()
  const cardNode = getCardNode()
  timerHideRef = window.setTimeout(() => {
    cardNode.classList.remove('card_visible')
    cardNode.classList.add('card_hidden')
    setDictHistory([])
  }, ms)
}

function clearTimerHideRef() {
  timerHideRef && clearTimeout(timerHideRef)
}

function toggleZenMode() {
  if (!zenMode()) {
    const words = Array.from(document.querySelectorAll('.' + classes.unknown)).map(node => getNodeWord(node))
    batch(() => {
      setZenModeWords([...new Set(words)])
      setZenExcludeWords([])
    })
  }
  setZenMode(!zenMode())
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
  cardNode.classList.remove('card_hidden')
  cardNode.classList.add('card_visible')
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

    if (node.classList.contains(classes.mark)) {
      if (!zenMode() && !node.classList.contains(classes.in_viewport)) {
        return false
      }
      // skip when redirecting in card dictionary
      if (inDirecting) {
        inDirecting = false
        return false
      }

      const word = getNodeWord(node)

      rect = node.getBoundingClientRect()
      adjustCardPosition(rect)
      batch(() => {
        setCurWord(word)
        setCurContextText(getWordContext(node))
        setWordContexts(getWordContexts(word))
        setDictHistory([word])
      })

      timerShowRef && clearTimeout(timerShowRef)
      timerShowRef = window.setTimeout(() => {
        showPopup()
      }, 200)

      clearTimerHideRef()
      node.addEventListener('mouseleave', hidePopup)
    }

    if (node.shadowRoot === document.querySelector('wh-card')?.shadowRoot) {
      clearTimerHideRef()
    }
  })
}

// https://github.com/solidjs/solid/tree/main/packages/solid-element#hot-module-replacement-new
if (import.meta.hot) {
  import.meta.hot.accept(newModule => {
    if (newModule) {
      // newModule is undefined when SyntaxError happened
      walk(document.body, (node: Node) => {
        if ((node as HTMLElement).localName === 'wh-card') {
          setTimeout(() => reloadElement(node as unknown as ICustomElement), 0)
        }
      })
    }
  })
}
