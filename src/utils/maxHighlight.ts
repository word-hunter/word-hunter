import { createSignal } from 'solid-js'
import { defaultMaxHighlight, StorageKey } from '../constant'

const [maxHighlight, setMax] = createSignal<number>(defaultMaxHighlight)

function readMaxHighlight() {
  chrome.storage.local.get(StorageKey.maxHighlight, result => {
    const max = result[StorageKey.maxHighlight] ?? defaultMaxHighlight
    setMax(max)
  })
}

const updateMaxHighlight = (max: number) => {
  setMax(max)
  chrome.storage.local.set({ [StorageKey.maxHighlight]: max }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const curId = tabs[0].id
      if (curId) {
        chrome.scripting.executeScript({
          target: { tabId: curId },
          func: () => {
            window.__setMaxHighlight()
          }
        })
      }
    })
  })
}

// this function expose to be called in popup page
window.__setMaxHighlight = readMaxHighlight

readMaxHighlight()

export { maxHighlight, updateMaxHighlight }
