import { createSignal } from 'solid-js'
import { executeScript, settings } from '../lib'
import styles from './app.module.css'

export const Statistics = () => {
  const [counts, setCounts] = createSignal([0, 0, 1]) // unknown,  have context, total
  const getStatistics = async () => {
    const res = await executeScript(() => {
      return window.__getPageStatistics?.()
    })
    if (res?.[0]?.result) {
      setCounts([...res[0].result])
    }
  }

  const unKnownPercent = () => (counts()[0] / counts()[2]) * 100
  const contextPercent = () => (counts()[1] / counts()[2]) * 100

  getStatistics()

  return (
    <div class={styles.stat}>
      <div>
        Page Stats: ( <span style={{ color: settings()['colors'][0] }}>{counts()[0]}</span> +{' '}
        <span style={{ color: settings()['colors'][1] }}>{counts()[1]}</span> ) / {counts()[2]}
      </div>
      <svg viewBox="0 0 64 64" class={styles.pie}>
        <circle
          r="25%"
          cx="50%"
          cy="50%"
          style={{ 'stroke-dasharray': `${unKnownPercent()} 100`, stroke: settings()['colors'][0] }}
        >
          <title>unknown</title>
        </circle>
        <circle
          r="25%"
          cx="50%"
          cy="50%"
          style={{
            'stroke-dasharray': `${contextPercent()} 100`,
            'stroke-dashoffset': `-${unKnownPercent()}`,
            stroke: settings()['colors'][1]
          }}
        >
          <title>have context</title>
        </circle>
      </svg>
    </div>
  )
}
