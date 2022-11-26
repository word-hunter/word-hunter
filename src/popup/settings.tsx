import { useEffect, useState } from 'react'

import { defaultColors } from '../constant'
import styles from './settings.module.less'

export const Settings = () => {
  const [colors, setColors] = useState<string[]>(defaultColors)
  useEffect(() => {
    chrome.storage.local.get(['colors'], result => {
      const colors = result['colors'] ?? defaultColors
      setColors(colors)
    })
  }, [])

  const onColorChange = e => {
    const target = e.nativeEvent.target
    const newColors = [target.value]
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

  return (
    <div className={styles.container}>
      <div className={styles.colorSetting}>
        <h4>Color Setting:</h4>
        <div className={styles.colorInputs}>
          <div>
            <label htmlFor="color_unknown">Unknown:</label>
            <input
              type="color"
              id="color_unknown"
              name="color_unknown"
              data-index="0"
              value={colors[0]}
              onChange={onColorChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
