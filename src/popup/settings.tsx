import { useEffect, useState } from 'react'

import { defaultColors } from '../constant'
import styles from './settings.module.less'

export const Settings = () => {
  const [colors, setColors] = useState<string[]>(defaultColors)
  useEffect(() => {
    chrome.storage.local.get(['colors'], result => {
      const colors = result['colors'] ?? defaultColors
      console.log(colors)
      setColors(colors)
    })
  }, [])

  const onColorChange = e => {
    const target = e.nativeEvent.target
    const index = Number(target.dataset.index)
    const newColors = index === 0 ? [target.value, colors[1]] : [colors[0], target.value]
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
          <div>
            <label htmlFor="color_half_known">known a little:</label>
            <input
              type="color"
              id="color_half_known"
              name="color_half_known"
              data-index="1"
              value={colors[1]}
              onChange={onColorChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
