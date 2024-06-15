import styles from './app.module.css'
import { Statistics } from './statistics'
import { Show, createSignal, onMount } from 'solid-js'
import { settings, setSetting, executeScript, getLocalValue } from '../lib'
import manifest from '../../manifest.json'
import { StorageKey } from '../constant'

const onFastModeToggle = () => {
  executeScript(() => window.__toggleZenMode())
}

const onPdfViewer = () => {
  chrome.tabs.create({
    url: `https://mozilla.github.io/pdf.js/web/viewer.html?file=${chrome.runtime.getURL('elephant.pdf')}`
  })
  return false
}

const onEpubViewer = () => {
  chrome.tabs.create({
    url: 'https://app.flowoss.com/'
  })
  return false
}

const onDirectToOption = async () => {
  if (chrome.sidePanel?.open) {
    const win = await chrome.windows.getCurrent()
    window.close()
    chrome.sidePanel.setOptions({ path: 'src/options.html' })
    chrome.sidePanel.open({ windowId: win.id! })
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') })
  }
  return false
}

export const App = () => {
  const [isBanned, setIsBanned] = createSignal(false)
  const [showVersionTip, setShowVersionTip] = createSignal(false)

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
      chrome.sidePanel.open({ windowId: win.id! })
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

  onMount(async () => {
    const curVersion = manifest.version
    const lastVersion = await getLocalValue(StorageKey.version)
    if (curVersion !== lastVersion) {
      setShowVersionTip(true)
    }
  })

  const onVersionTipClose = () => {
    setShowVersionTip(false)
    chrome.storage.local.set({ [StorageKey.version]: manifest.version })
  }

  return (
    <div class={styles.page}>
      <div>
        <Statistics />
        <div class={styles.buttons}>
          <button onclick={onFastModeToggle}>
            ️<img src={chrome.runtime.getURL('icons/zen.png')} width="20" height="20" /> Zen mode
          </button>
          <button onclick={onPdfViewer}>
            ️<img src={chrome.runtime.getURL('icons/pdf.png')} width="20" height="20" /> PDF reader
          </button>
          <button onclick={onEpubViewer}>
            ️<img src={chrome.runtime.getURL('icons/epub.png')} width="20" height="20" /> ePUB reader
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
      <a class={styles.preference} onclick={onDirectToOption} href="#" title="settings">
        ⛭️
      </a>
      <Show when={showVersionTip()}>
        <div class={styles.newRelease}>
          <a href="https://github.com/word-hunter/word-hunter/releases" target="_blank" onclick={onVersionTipClose}>
            🥳<span>What's new ↗</span>
          </a>
        </div>
      </Show>
    </div>
  )
}
