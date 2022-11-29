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

  return (
    <div className={styles.container}>
      <div>
        Page Stats: <span style={{ color: colors[0] }}>{counts[0]}</span> / {counts[1]}
      </div>
      <div>
        <progress id="stat" max={counts[1]} value={counts[0]} />
      </div>
      <style>
        {`
          progress::-webkit-progress-value {
            background: ${colors[0]};
          }

          progress::-webkit-progress-bar {
            background: #ccc;
          }
      `}
      </style>
    </div>
  )
}
