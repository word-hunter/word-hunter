import styles from './app.module.less'

function setAllKnownInContextScript() {
  window.__markAsAllKnown()
}

export const App = () => {
  const onSetAllKnown = () => {
    confirm('Are you sure you want to mark all unknown words on this page as known?') &&
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const curId = tabs[0].id
        if (curId) {
          chrome.scripting.executeScript({ target: { tabId: curId }, func: setAllKnownInContextScript })
        }
      })
  }

  const onDirectToWordBook = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })
  }

  return (
    <div className={styles.popup}>
      <button onClick={onSetAllKnown}>👻 set all words as known</button>
      <button onClick={onDirectToWordBook}>📗 open word book</button>
    </div>
  )
}
