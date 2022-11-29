import { useEffect, useState } from 'react'

import { defaultColors } from '../constant'
import { executeScript } from '../utils'
import styles from './statistics.module.less'

export const Statistics = () => {
  const [counts, setCounts] = useState([0, 1])
  const [colors, setColors] = useState<string[]>(defaultColors)

  const getStatistics = async () => {
    const res = await executeScript(() => {
      return window.__getPageStatistics()
    })
    setCounts([...res[0].result])
  }

  useEffect(() => {
    getStatistics()
    chrome.storage.local.get(['colors'], result => {
      const colors = result['colors'] ?? defaultColors
      setColors(colors)
    })
  }, [])

  const percent = (counts[0] / counts[1]) * 100

  return (
    <div className={styles.container}>
      <div>
        Page Stats: <span style={{ color: colors[0] }}>{counts[0]}</span> / {counts[1]}
      </div>
      <svg viewBox="0 0 64 64" className={styles.pie}>
        <circle r="25%" cx="50%" cy="50%" style={{ strokeDasharray: `${percent} 100`, stroke: colors[0] }}>
          <title>unknown</title>
        </circle>
      </svg>
    </div>
  )
}
