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
  const onSetAllKnown = () => {
    confirm('Are you sure you want to mark all unknown words on this page as known?') &&
      executeScript(() => window.__markAsAllKnown())
  }

  const onDirectToOption = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') })
    return false
  }

  const onFastModeToggle = () => {
    executeScript(() => window.__toggleZenMode())
  }

  const onPdfViewer = () => {
    chrome.tabs.create({
      url: `https://mozilla.github.io/pdf.js/web/viewer.html?file=${chrome.runtime.getURL('elephant.pdf')}`
    })
    return false
  }

  return (
    <div class={styles.page}>
      <Statistics />
      <div class={styles.buttons}>
        <button onclick={onFastModeToggle}>
          ️<img src={chrome.runtime.getURL('icons/quick-mode-on.png')} width="20" height="20" /> Toggle zen mode
        </button>
        <button onclick={onSetAllKnown}>
          <img src={chrome.runtime.getURL('icons/check-all.png')} width="20" height="20" /> Set all words as known
        </button>
        <button onclick={onPdfViewer}>
          ️<img src={chrome.runtime.getURL('icons/pdf.png')} width="20" height="20" /> Open PDF reader
        </button>
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
    </div>
  )
}
