import './index.css'
import cardStyles from './card.css?inline'
import { createSignal, Show, For, Switch, Match, batch, onMount } from 'solid-js'
import { customElement } from 'solid-element'
import { classes, Messages, WordContext } from '../constant'
import {
  init as highlightInit,
  unknownHL,
  contextHL,
  getRangeWord,
  markAsKnown,
  markAsAllKnown,
  addContext,
  deleteContext,
  isInDict,
  getWordContexts,
  wordContexts,
  setWordContexts,
  isWordKnownAble,
  zenExcludeWords,
  setZenExcludeWords,
  getWordAllTenses,
  cacheRangeRectsAtPointElement,
  getRangeAtPoint
} from './highlight'
import { getMessagePort } from '../lib/port'
import { Dict } from './dict'
import { adapters, AdapterKey } from './adapters'
import { getWordContext, safeEmphasizeWordInText, getFaviconByDomain, settings, explode } from '../lib'
import { readBlacklist } from '../lib/blacklist'

let timerShowRef: number
let timerHideRef: number
let inDirecting = false
let rangeRect: DOMRect

const [curWord, setCurWord] = createSignal('')
const [dictHistory, setDictHistory] = createSignal<string[]>([])
const [zenMode, setZenMode] = createSignal(false)
const [zenModeWords, setZenModeWords] = createSignal<string[]>([])
const [cardDisabledInZenMode, setCardDisabledInZenMode] = createSignal(false)
const [curContextText, setCurContextText] = createSignal('')
const [tabIndex, setTabIndex] = createSignal(0)

export const WhCard = customElement('wh-card', () => {
  const dictTabs = () => settings()['dictTabs']
  const availableDicts = () => settings().dictOrder.filter(key => dictTabs()[key as AdapterKey]) as AdapterKey[]
  const adapterName = () => (availableDicts()[tabIndex()] ?? availableDicts()[0]) as AdapterKey
  const getDictAdapter = () => adapters[adapterName()]
  const tabCount = () => availableDicts().length

  onMount(() => {
    readBlacklist().then(async blacklist => {
      try {
        if (blacklist.includes(location.host) || blacklist.includes(top?.location.host)) return
      } catch (e) {
        // do nothing, some times the frame is cross origin, and will throw error for `top.location.host`
      }
      await highlightInit()
      bindEvents()
    })
  })

  const onKnown = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault()
    const word = curWord()
    markAsKnown(word)
    setCurWord('')
    hidePopupDelay(0)
    if (e instanceof MouseEvent && e.pageX) {
      explode(e.pageX, e.pageY)
    } else {
      explode(rangeRect.left, rangeRect.top)
    }
  }

  const onAddContext = (e: MouseEvent | KeyboardEvent) => {
    if (zenMode()) return false
    e.preventDefault()
    const word = curWord()
    addContext(word, curContextText())
    setTabIndex(tabCount())
  }

  const onCardClick = (e: MouseEvent) => {
    const node = e.target as HTMLElement
    playAudio(node, e)

    if (node.tagName === 'A' && node.dataset.href) {
      e.stopImmediatePropagation()
      const word = getDictAdapter().getWordByHref(node.dataset.href)
      if (word === curWord()) return false

      inDirecting = true
      setCurWord(word)
      setDictHistory([...dictHistory(), word])
      return false
    }

    if (node.tagName === 'A' && node.getAttribute('href') === '#') {
      e.stopImmediatePropagation()
      e.preventDefault()
      getCardNode().querySelector('.dict_container')!.scrollTop = 0
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
    adjustCardPosition(rangeRect, inDirecting)
    inDirecting = false
    runAtuoPronounce()
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

  // for page like calibre, stop the document scroll when mouse wheel on card
  const onWheel = (e: WheelEvent) => {
    e.stopImmediatePropagation()
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const cardNode = getCardNode()
    const container = cardNode.querySelector('.dict_container')!
    if (isCardVisible()) {
      if (!e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          const selector = getDictAdapter().sectionSelector
          if (!selector) return
          const sections = container.querySelectorAll(selector) as NodeListOf<HTMLElement>
          const rootMargin = 30
          const firstInViewportIndex = Array.from(sections).findIndex(s => {
            return s.offsetTop > container.scrollTop
          })
          if (e.key === 'ArrowUp') {
            if (firstInViewportIndex > 0) {
              container.scrollTop = sections[firstInViewportIndex - 1].offsetTop - rootMargin
            }
          }
          if (e.key === 'ArrowDown') {
            if (firstInViewportIndex < sections.length - 1) {
              container.scrollTop = sections[firstInViewportIndex + 1].offsetTop - rootMargin
            }
          }
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') {
          if (e.key === 'ArrowLeft') {
            setTabIndex(tabIndex() > 0 ? tabIndex() - 1 : tabCount())
          }
          if (e.key === 'ArrowRight' || e.key === 'Tab') {
            setTabIndex(tabIndex() < tabCount() ? tabIndex() + 1 : 0)
          }
        }
        if (e.key === 'Escape') {
          hidePopupDelay(0)
        }
        if (e.key === 'a') {
          onKnown(e)
        }
        if (e.key === 's') {
          onAddContext(e)
        }
        e.preventDefault()
      }
    }
  })

  return (
    // @ts-ignore inert property
    <div class="word_card" onclick={onCardClick} ondblclick={onCardDoubleClick} inert>
      <div class="toolbar">
        <div>
          <button disabled={!isWordKnownAble(curWord())} onclick={onKnown} title="known">
            <img src={chrome.runtime.getURL('icons/checked.png')} alt="ok" />
          </button>
          <button onclick={onAddContext} disabled={inWordContexts() || dictHistory().length > 1} title="save context">
            <img
              src={chrome.runtime.getURL(!inWordContexts() ? 'icons/filled-star.png' : 'icons/filled-star.png')}
              alt="save"
            />
          </button>
        </div>
        <div>
          <a target="_blank" href={getDictAdapter().getPageUrl(curWord())}>
            {curWord()}
          </a>
        </div>
        <div>
          <button onClick={goYouGlish} title="youglish">
            <img src={chrome.runtime.getURL('icons/cinema.png')} alt="youglish" />
          </button>
          <button class="history_back" disabled={dictHistory().length < 2} title="back">
            <img src={chrome.runtime.getURL('icons/undo.png')} alt="back" />
          </button>
        </div>
      </div>
      <div class="tabs">
        <div>
          <For each={availableDicts()}>
            {(dictName, i) => (
              <button onclick={() => setTabIndex(i)} classList={{ selected: tabIndex() === i() }}>
                {dictName}
              </button>
            )}
          </For>
          <button onclick={() => setTabIndex(tabCount())} classList={{ selected: tabIndex() === tabCount() }}>
            Contexts
          </button>
        </div>
      </div>
      <div class="dict_container" onWheel={onWheel}>
        <Show when={curWord()}>
          <Switch fallback={null}>
            <Match when={tabIndex() === tabCount()}>
              <ContextList contexts={wordContexts()}></ContextList>
            </Match>
            <For each={availableDicts()}>
              {(dictName, i) => (
                <Match when={tabIndex() === i()}>
                  <Dict
                    word={curWord()}
                    contextText={curContextText()}
                    dictAdapter={getDictAdapter()}
                    onSettle={onDictSettle}
                  />
                </Match>
              )}
            </For>
          </Switch>
        </Show>
      </div>
      <style>{cardStyles}</style>
      <style>{getDictAdapter().style}</style>
    </div>
  )
})

export function ZenMode() {
  const setCardDisabledStatus = (e: InputEvent) => {
    setCardDisabledInZenMode((e.target as HTMLInputElement).checked)
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && zenMode() && !isCardVisible()) {
      toggleZenMode()
    }
  })

  const onWordClick = (e: MouseEvent) => {
    const node = e.target as HTMLElement
    if (e.metaKey || e.ctrlKey) {
      const word = node.dataset.word!
      if (zenExcludeWords().includes(word)) {
        setZenExcludeWords(zenExcludeWords().filter(w => w !== curWord()))
      } else {
        setZenExcludeWords([...zenExcludeWords(), word])
      }
    }
  }

  const onSetAllKnown = () => {
    confirm('Are you sure you want to mark all unknown words on this page as known?') && markAsAllKnown()
  }

  const onUnselectAll = () => {
    if (zenExcludeWords().length > 0) {
      setZenExcludeWords([])
    } else {
      setZenExcludeWords([...zenModeWords()])
    }
  }

  return (
    <Show when={zenMode()}>
      <div class={classes.zen_mode}>
        <div class="zen_close_btn" title="close" onclick={toggleZenMode}>
          <img src={chrome.runtime.getURL('icons/cancel.png')} width="30" height="30" alt="delete" />
        </div>
        <pre>
          <p>
            Note: use <kbd>⌘</kbd> + <kbd>Click</kbd> to unselect word
          </p>
        </pre>
        <div class="zen_buttons">
          <button onclick={onUnselectAll} title="Unselect All">
            <img src={chrome.runtime.getURL('icons/unselect.png')} width="20" height="20" alt="Unselect all words" />
            Unselect All
          </button>
          <button onclick={onSetAllKnown} title="Set all words as known">
            <img src={chrome.runtime.getURL('icons/checked.png')} width="20" height="20" alt="Set all words as known" />
            Set all words as known
          </button>
          <label>
            <input type="checkbox" oninput={setCardDisabledStatus} checked={cardDisabledInZenMode()} />
            disable card popup
          </label>
        </div>
        <div class="zen_words">
          <For each={zenModeWords()}>
            {(word: string) => {
              return (
                <span
                  classList={{ [classes.excluded]: zenExcludeWords().includes(word) }}
                  onclick={onWordClick}
                  data-word={word}
                >
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
  const allTenstionWords = () => getWordAllTenses(curWord()).reverse()
  return (
    <Show
      when={props.contexts.length > 0}
      fallback={
        <div class="no-contexts">
          <img src={chrome.runtime.getURL('icons/robot.png')} alt="no contexts" />
          no contexts
        </div>
      }
    >
      <div class="contexts">
        <For each={props.contexts.reverse()}>
          {(context: WordContext) => {
            const highlightedContext = safeEmphasizeWordInText(context.text, allTenstionWords().join('|'))
            return (
              <div>
                <pre innerHTML={highlightedContext}></pre>
                <p>
                  <img src={context.favicon || getFaviconByDomain(context.url)} alt="favicon" />
                  <a href={context.url} target="_blank">
                    {context.title}
                  </a>
                </p>
                <button title="delete context" onclick={() => deleteContext(context)}>
                  <img src={chrome.runtime.getURL('icons/cancel.png')} alt="delete" />
                </button>
              </div>
            )
          }}
        </For>
      </div>
    </Show>
  )
}

function getCardNode() {
  const root = document.querySelector('wh-card')?.shadowRoot
  return root?.querySelector('.' + classes.card) as HTMLElement
}

const isCardVisible = () => {
  return getCardNode().classList.contains('card_visible')
}

function getNodeWord(node: HTMLElement | Node | undefined) {
  if (!node) return ''
  return (node.textContent ?? '').toLowerCase()
}

const playAudio = (node: HTMLElement, e?: MouseEvent) => {
  const audioSrc = node?.getAttribute('data-src-mp3') || node?.parentElement?.getAttribute('data-src-mp3')
  if (audioSrc) {
    getMessagePort().postMessage({ action: Messages.play_audio, audio: audioSrc })
    e && e.stopImmediatePropagation()
    node.classList.add('active')
    setTimeout(() => {
      node?.classList.remove('active')
    }, 1000)
    return false
  }
}

const runAtuoPronounce = () => {
  if (isCardVisible() && settings().atuoPronounce) {
    // play amarican english audio first
    let ameNode = getCardNode().querySelector('.amefile[data-src-mp3]')
    if (ameNode) {
      playAudio(ameNode as HTMLElement)
    } else {
      playAudio(getCardNode().querySelector('[data-src-mp3]') as HTMLElement)
    }
  }
}

function hidePopupDelay(ms: number) {
  clearTimerHideRef()
  timerHideRef = window.setTimeout(() => {
    const cardNode = getCardNode()
    cardNode.classList.remove('card_visible')
    cardNode.inert = true
    setDictHistory([])
  }, ms)
}

function clearTimerHideRef() {
  timerHideRef && clearTimeout(timerHideRef)
}

function toggleZenMode() {
  if (!zenMode()) {
    const words = [...unknownHL.values(), ...contextHL.values()].map(range => getRangeWord(range))
    batch(() => {
      setZenModeWords([...new Set(words)])
      setZenExcludeWords([])
    })
  }
  setZenMode(!zenMode())
}

// this function expose to be called in popup page
window.__toggleZenMode = toggleZenMode

function showPopup() {
  const dictTabs = () => settings()['dictTabs']
  const availableDicts = () => settings().dictOrder.filter(key => dictTabs()[key as AdapterKey]) as AdapterKey[]
  const tabCount = () => availableDicts().length
  const cardNode = getCardNode()
  if (tabIndex() === tabCount()) {
    setTabIndex(0)
  }
  cardNode.classList.add('card_visible')
  cardNode.inert = false
  runAtuoPronounce()
}

function adjustCardPosition(rect: DOMRect, onlyOutsideViewport = false) {
  const cardNode = getCardNode()
  const { x: x, y: y, width: m_width, height: m_height } = rect
  const { x: c_x, y: c_y, width: c_width, height: c_height } = cardNode.getBoundingClientRect()

  const MARGIN_X = 1

  let left = x + m_width + MARGIN_X
  let top = y - 20
  // if overflow right viewport
  if (left + c_width > window.innerWidth) {
    if (x > c_width) {
      left = x - c_width - MARGIN_X
    } else {
      left = window.innerWidth - c_width - 30
      top = y + m_height + MARGIN_X
    }
  }
  // if overflow top viewport
  if (top < 0) {
    top = MARGIN_X
  }

  if (top + c_height > window.innerHeight) {
    top = window.innerHeight - c_height - MARGIN_X - 10
  }

  if (!onlyOutsideViewport || c_y < 0 || c_y + c_height > window.innerHeight) {
    // cardNode.style.top = `${top}px`
    cardNode.style.transform = `translate(${left}px, ${top}px)`
  }

  if (!onlyOutsideViewport || c_x < 0 || c_x + c_width > window.innerWidth) {
    cardNode.style.transform = `translate(${left}px, ${top}px)`
  }
}

function bindEvents() {
  document.addEventListener('mousemove', async (e: MouseEvent) => {
    if (zenMode() && cardDisabledInZenMode()) {
      return false
    }

    const range = getRangeAtPoint(e)
    if (range) {
      clearTimerHideRef()
      const word = range.toString().trim().toLowerCase()
      if (isCardVisible() && word === curWord()) return false
      // skip when redirecting in card dictionary
      const mosueKey = settings().mosueKey
      if (mosueKey !== 'NONE' && !e[mosueKey]) return false

      if (inDirecting) {
        inDirecting = false
        return false
      }

      rangeRect = range.getBoundingClientRect()
      adjustCardPosition(rangeRect)
      batch(() => {
        setCurWord(word)
        setCurContextText(getWordContext(range))
        setWordContexts(getWordContexts(word))
        setDictHistory([word])
      })

      timerShowRef && clearTimeout(timerShowRef)
      timerShowRef = window.setTimeout(() => {
        showPopup()
      }, 200)
    } else {
      const target = e.target as HTMLElement
      if (isCardVisible()) {
        if (target.tagName !== 'WH-CARD' && !getCardNode().contains(target)) {
          hidePopupDelay(500)
        } else {
          clearTimerHideRef()
        }
      }
    }
  })

  document.addEventListener('mousemove', cacheRangeRectsAtPointElement)

  // hide popup when click outside card
  document.addEventListener('click', async (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (isCardVisible() && !getCardNode().contains(target)) {
      hidePopupDelay(0)
    }
  })
}
