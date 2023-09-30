import styles from './app.module.css'
import { Settings } from './settings'
import { Statistics } from './statistics'
import { createSignal } from 'solid-js'
import { settings, setSetting, executeScript } from '../lib'

const onFastModeToggle = () => {
  executeScript(() => window.__toggleZenMode())
}

const onPdfViewer = () => {
  chrome.tabs.create({
    url: `https://mozilla.github.io/pdf.js/web/viewer.html?file=${chrome.runtime.getURL('elephant.pdf')}`
  })
  return false
}

export const App = () => {
  const [isBanned, setIsBanned] = createSignal(false)
  const [index, setIndex] = createSignal(0)

  const onToggleBlacklist = async () => {
    const [inBlocklist, host, blacklist] = await getBannedState()
    const newBlacklist = inBlocklist ? blacklist.filter(h => h !== host) : [...blacklist, host]
    setIsBanned(!inBlocklist)
    await setSetting('blacklist', newBlacklist)
    executeScript(() => window.__updateAppIcon())
  }

  const onKnownLogs = async () => {
    if (chrome.sidePanel?.open) {
      const win = await chrome.windows.getCurrent()
      window.close()
      chrome.sidePanel.setOptions({ path: 'src/logs.html' })
      chrome.sidePanel.open({ windowId: win.id })
    } else {
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/logs.html')
      })
    }
  }

  const getBannedState = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const host = new URL(tabs[0].url!).host
    const blacklist = settings()['blacklist']
    const inBlocklist = blacklist.includes(host)
    return [inBlocklist, host, blacklist] as const
  }

  getBannedState().then(([inBlocklist]) => {
    setIsBanned(inBlocklist)
  })

  return (
    <div class={styles.page}>
      <section data-active={index() == 0 ? 'true' : 'false'}>
        <h2
          onclick={() => {
            setIndex(0)
          }}
        >
          Page Stats<span>➳</span>
        </h2>
        <div>
          <Statistics />
          <div class={styles.buttons}>
            <button onclick={onFastModeToggle}>
              ️<img src={chrome.runtime.getURL('icons/zen.png')} width="20" height="20" /> Toggle zen mode
            </button>
            <button onclick={onPdfViewer}>
              ️<img src={chrome.runtime.getURL('icons/pdf.png')} width="20" height="20" /> Open PDF reader
            </button>
            <button onclick={onKnownLogs}>
              ️<img src={chrome.runtime.getURL('icons/logs.png')} width="20" height="20" />
              Daily Logs
            </button>
            <button onclick={onToggleBlacklist}>
              ️
              <img
                src={chrome.runtime.getURL(isBanned() ? 'icons/toggle-off.png' : 'icons/toggle-on.png')}
                width="20"
                height="20"
              />
              {isBanned() ? 'Enable on this site' : 'Disable on this site'}
            </button>
          </div>
        </div>
      </section>
      <section data-active={index() == 1 ? 'true' : 'false'}>
        <h2
          onclick={() => {
            setIndex(1)
          }}
        >
          Settings<span>➳</span>
        </h2>
        <div>
          <Settings />
        </div>
      </section>
    </div>
  )
}
