import { createSignal } from 'solid-js'
import { executeScript, settings } from '../lib'
import styles from './statistics.module.less'

export const Statistics = () => {
  const [counts, setCounts] = createSignal([0, 1])
  const getStatistics = async () => {
    const res = await executeScript(() => {
      return window.__getPageStatistics()
    })
    setCounts([...res[0].result])
  }

  const percent = () => (counts()[0] / counts()[1]) * 100

  getStatistics()

  return (
    <div class={styles.container}>
      <div>
        Page Stats: <span style={{ color: settings()['colors'][0] }}>{counts()[0]}</span> / {counts()[1]}
      </div>
      <svg viewBox="0 0 64 64" class={styles.pie}>
        <circle
          r="25%"
          cx="50%"
          cy="50%"
          style={{ 'stroke-dasharray': `${percent()} 100`, stroke: settings()['colors'][0] }}
        >
          <title>unknown</title>
        </circle>
      </svg>
    </div>
  )
}
