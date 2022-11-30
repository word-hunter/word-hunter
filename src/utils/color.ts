import { createSignal } from 'solid-js'
import { defaultColors } from '../constant'

const [colors, setColors] = createSignal<string[]>(defaultColors)

chrome.storage.local.get(['colors'], result => {
  const colors = result['colors'] ?? defaultColors
  setColors(colors)
})

const updateColors = (newColors: string[]) => {
  setColors(newColors)
  chrome.storage.local.set({ colors: newColors }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const curId = tabs[0].id
      if (curId) {
        chrome.scripting.executeScript({
          target: { tabId: curId },
          func: () => {
            window.__setColorStyle()
          }
        })
      }
    })
  })
}

export { colors, updateColors }
