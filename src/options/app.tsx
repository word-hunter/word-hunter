import { useEffect, useMemo, useState } from 'react'

import type { WordContext } from '../constant'
import { WordType } from '../constant'
import { emphasizeWordInText } from '../utils'
import styles from './app.module.less'

const timeformatter = new Intl.DateTimeFormat('en-US')

export const App = () => {
  const [halfWords, setHalfWords] = useState<WordContext[]>([])
  const [timeIndex, setTimeIndex] = useState('0')

  const onTimeChanged = e => {
    setTimeIndex(e.nativeEvent.target.value)
  }

  useEffect(() => {
    chrome.storage.local.get([WordType.half], result => {
      const words = (Object.values(result[WordType.half] ?? {}) as WordContext[]).sort(
        (a, b) => b.timestamp - a.timestamp
      )
      setHalfWords(words)
    })
  }, [])

  const wordsInTimeRange = useMemo(
    () =>
      halfWords.filter(word => {
        if (timeIndex === '0') return true
        return word.timestamp > Date.now() - Number(timeIndex) * 24 * 3600 * 1000
      }),
    [halfWords, timeIndex]
  )

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Word book</h1>
      <div className={styles.toolbar}>
        <select name="time" onChange={onTimeChanged}>
          <option value="0">select time</option>
          <option value="1">1 day</option>
          <option value="2">2 days</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">a year</option>
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th>
              word <i>({wordsInTimeRange.length})</i>
            </th>
            <th>context</th>
            <th>source</th>
            <th>time️</th>
          </tr>
        </thead>
        <tbody>
          {!wordsInTimeRange.length && (
            <tr>
              <td colSpan={4} align="center">
                😭 no word yet.
              </td>
            </tr>
          )}
          {wordsInTimeRange.map(item => {
            return (
              <tr key={item.word}>
                <td>
                  <b>{item.word}</b>
                </td>
                <td>
                  <p dangerouslySetInnerHTML={{ __html: emphasizeWordInText(item.text, item.word, 'mark') }}></p>
                </td>
                <td>
                  <div className={styles.source_item}>
                    {!!item.favicon && <img src={item.favicon} width="16" height="16" />}
                    <a href={item.url}>
                      <i>{item.url}</i>
                    </a>
                  </div>
                </td>
                <td>{timeformatter.format(item.timestamp)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
