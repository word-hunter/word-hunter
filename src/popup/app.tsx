import styles from './app.module.less'
import { Settings } from './settings'

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
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })
    return false
  }

  const onFastModeToggle = () => {
    executeScript(() => window.__toggleZenMode())
  }

  return (
    <div className={styles.page}>
      <div className={styles.buttons}>
        <button onClick={onFastModeToggle}>⚡️ toggle zen mode</button>
        <button onClick={onSetAllKnown}>👻 set all words as known</button>
      </div>
      <div>
        <details>
          <summary>Settings</summary>
          <Settings />
          <div className={styles.link}>
            <a onClick={onDirectToOption} href="#">
              Options
            </a>
          </div>
        </details>
      </div>
    </div>
  )
}
