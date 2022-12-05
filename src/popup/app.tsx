import { createSignal, Show } from 'solid-js'
import styles from './app.module.less'
import { Settings } from './settings'
import { Statistics } from './statistics'

export const executeScript = (func: () => void) => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const curId = tabs[0].id
    if (curId) {
      chrome.scripting.executeScript({ target: { tabId: curId }, func: func })
    }
  })
}

export const App = () => {
  const [isExtensionPage, setIsExtensionPage] = createSignal(false)

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0]
    if (tab.url?.startsWith('chrome-extension://')) {
      setIsExtensionPage(true)
    }
  })

  const onSetAllKnown = () => {
    confirm('Are you sure you want to mark all unknown words on this page as known?') &&
      executeScript(() => window.__markAsAllKnown())
  }

  const onDirectToOption = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') })
    return false
  }

  const onPdfViewer = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('pdf-reader/viewer.html') })
    return false
  }

  const onFastModeToggle = () => {
    executeScript(() => window.__toggleZenMode())
  }

  return (
    <div class={styles.page}>
      <Show when={!isExtensionPage()} fallback={<div class={styles.unsupport}>😭 not supported on pdf viewer</div>}>
        <Statistics />
        <div class={styles.buttons}>
          <button onclick={onFastModeToggle}>⚡️ Toggle zen mode</button>
          <button onclick={onSetAllKnown}>👻 Set all words as known</button>
          <button onclick={onPdfViewer}>👁️ Open PDF reader</button>
        </div>
        <div>
          <details>
            <summary>Settings</summary>
            <Settings />
            <div class={styles.link}>
              <a onclick={onDirectToOption} href="#">
                Options
              </a>
            </div>
          </details>
        </div>
      </Show>
    </div>
  )
}
