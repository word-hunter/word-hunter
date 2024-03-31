import './index.css'
import cardStyles from './card.css?inline'
import { createSignal, createEffect, Show, For, Switch, Match, batch, onMount, onCleanup } from 'solid-js'
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

  const onDictSettle = (index: number) => {
    if (tabIndex() === index) {
      adjustCardPosition(rangeRect, inDirecting)
      inDirecting = false
      runAutoPronounce()
    }
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

  const onKeydown = (e: KeyboardEvent) => {
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
  }

  document.addEventListener('keydown', onKeydown)

  onCleanup(() => {
    document.removeEventListener('keydown', onKeydown)
    unbindEvents()
  })

  // auto switch to first tab when context tab is selected and no contexts
  createEffect((prev?: number) => {
    const contexts = wordContexts()
    if (contexts.length === 0 && tabIndex() === tabCount() && prev === tabCount()) {
      setTabIndex(0)
    }
    return tabIndex()
  })

  const externalLink = () => {
    if (tabIndex() == tabCount()) return null
    return getDictAdapter().getPageUrl(curWord())
  }

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
          <a target={externalLink() ? '_blank' : '_self'} href={externalLink() || 'javascript:void(0)'}>
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
          <button
            onclick={() => setTabIndex(tabCount())}
            classList={{ selected: tabIndex() === tabCount(), hidden: !wordContexts().length }}
          >
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
                    onSettle={() => onDictSettle(i())}
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

  const _toggleZenMode = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && zenMode() && !isCardVisible()) {
      toggleZenMode()
    }
  }

  document.addEventListener('keydown', _toggleZenMode)
  onCleanup(() => {
    document.removeEventListener('keydown', _toggleZenMode)
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
  const allTensionWords = () => getWordAllTenses(curWord()).reverse()
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
            const highlightedContext = safeEmphasizeWordInText(context.text, allTensionWords().join('|'))
            let link =
              context.url + '#:~:text=' + encodeURIComponent(context.text?.replace(/[\n\r]+|[\s]{2,}/g, ' ').trim())
            link = link.replaceAll('-', '%2D')
            return (
              <div>
                <pre innerHTML={highlightedContext}></pre>
                <p>
                  <img src={context.favicon || getFaviconByDomain(context.url)} alt="favicon" />
                  <a href={link} target="_blank">
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

const playAudio = (node: HTMLElement, e?: MouseEvent) => {
  const audioSrc = node?.getAttribute('data-src-mp3') || node?.parentElement?.getAttribute('data-src-mp3')
  if (audioSrc) {
    getMessagePort().postMessage({ action: Messages.play_audio, audio: audioSrc })
    e && e.stopImmediatePropagation()
    node?.classList.add('active')
    setTimeout(() => {
      node?.classList.remove('active')
    }, 1000)
    return false
  }
}

const runAutoPronounce = () => {
  if (isCardVisible() && settings().autoPronounce) {
    // play american english audio first
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
  if (isCardVisible()) return false
  const dictTabs = () => settings()['dictTabs']
  const availableDicts = () => settings().dictOrder.filter(key => dictTabs()[key as AdapterKey]) as AdapterKey[]
  const tabCount = () => availableDicts().length
  const cardNode = getCardNode()
  if (wordContexts().length > 0) {
    setTabIndex(tabCount())
    // use chrome.tts to pronounce the word in context
    requestIdleCallback(() => {
      getMessagePort().postMessage({ action: Messages.play_audio, audio: null, word: curWord() })
    })
  } else if (tabIndex() === tabCount()) {
    setTabIndex(0)
  }
  cardNode.classList.add('card_visible')
  cardNode.inert = false
  runAutoPronounce()
}

function adjustCardPosition(rect: DOMRect, onlyOutsideViewport = false) {
  const cardNode = getCardNode()
  const { x: x, y: y, width: m_width, height: m_height } = rect
  const { x: c_x, y: c_y, width: c_width, height: c_height } = cardNode.getBoundingClientRect()

  const MARGIN_X = 1

  let left = x + m_width + MARGIN_X
  let top = y - 20
  let viewportWidth = window.innerWidth

  // handle iframe overflow
  try {
    if (parent !== self) {
      if (self.top?.innerWidth! < viewportWidth) {
        viewportWidth = self.top?.innerWidth ?? viewportWidth
        parent.document.querySelectorAll('iframe').forEach(iframe => {
          if (iframe.contentWindow === self) {
            const iframeRect = iframe.getBoundingClientRect()
            viewportWidth = viewportWidth - iframeRect.left
          }
        })
      }
    }
  } catch (e) {
    // do nothing
  }

  // if overflow right viewport
  if (left + c_width > viewportWidth) {
    if (x > c_width) {
      left = x - c_width - MARGIN_X
    } else {
      left = viewportWidth - c_width - 30
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

  if (!onlyOutsideViewport || c_x < 0 || c_x + c_width > viewportWidth) {
    cardNode.style.transform = `translate(${left}px, ${top}px)`
  }
}

let toQuickMarkWord: string
let holdKey: string | null = null

function onMouseMove(e: MouseEvent, silent = false) {
  if (!silent && zenMode() && cardDisabledInZenMode()) {
    return false
  }

  const target = e.target as HTMLElement
  const isInsideCard = isCardVisible() && (target.tagName === 'WH-CARD' || getCardNode().contains(target))

  if (isInsideCard) {
    clearTimerHideRef()
  } else {
    const range = getRangeAtPoint(e)
    if (range) {
      const word = range.toString().trim().toLowerCase()

      // for quick mark as known, don't show card
      if (!isCardVisible() && silent) {
        toQuickMarkWord = word
        return false
      }

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

      clearTimerHideRef()
      timerShowRef && clearTimeout(timerShowRef)
      timerShowRef = window.setTimeout(() => {
        showPopup()
      }, 200)
    } else {
      timerShowRef && clearTimeout(timerShowRef)
      isCardVisible() && hidePopupDelay(settings().mouseHideDelay ?? 500)
    }
  }
}

function onMouseClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (isCardVisible() && !getCardNode().contains(target)) {
    hidePopupDelay(0)
  }
}

function onAuxclick(e: MouseEvent) {
  if (holdKey === 'z' && toQuickMarkWord) {
    e.preventDefault()
    e.stopImmediatePropagation()
    e.preventDefault()
    markAsKnown(toQuickMarkWord)
    setCurWord('')
    hidePopupDelay(0)
    explode(e.pageX, e.pageY)
    toQuickMarkWord = ''
    return false
  }
}

let waitMouseKeyTask: Function | null

function preMouseMove(e: MouseEvent) {
  waitMouseKeyTask = null
  toQuickMarkWord = ''

  const mouseKey = settings().mouseKey
  if (mouseKey !== 'NONE' && !e[mouseKey]) {
    waitMouseKeyTask = () => {
      onMouseMove(e)
    }
  } else {
    onMouseMove(e, holdKey === 'z')
  }
}

function onKeyDown(e: KeyboardEvent) {
  holdKey = e.key
  if (e[settings().mouseKey]) {
    waitMouseKeyTask && waitMouseKeyTask()
  }
}

function onKeyUp(e: KeyboardEvent) {
  holdKey = null
  if (e[settings().mouseKey]) {
    waitMouseKeyTask = null
  }
}

function bindEvents() {
  document.addEventListener('mousemove', preMouseMove)
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  // hide popup when click outside card
  document.addEventListener('click', onMouseClick)
  document.addEventListener('auxclick', onAuxclick)
}

function unbindEvents() {
  document.removeEventListener('mousemove', preMouseMove)
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)
  document.removeEventListener('click', onMouseClick)
  document.removeEventListener('auxclick', onAuxclick)
}
