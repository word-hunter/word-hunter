import { useEffect, useState } from 'react'

import type { WordContext } from '../constant'
import { WordType } from '../constant'
import { emphasizeWordInText } from '../utils'
import styles from './app.module.less'

const timeformatter = new Intl.DateTimeFormat('en-US')

export const App = () => {
  const [halfWords, setHalfWords] = useState<WordContext[]>([])

  useEffect(() => {
    chrome.storage.local.get([WordType.half], result => {
      const words = (Object.values(result[WordType.half] ?? {}) as WordContext[]).sort(
        (a, b) => b.timestamp - a.timestamp
      )
      setHalfWords(words)
    })
  }, [])

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Word book</h1>
      <table>
        <thead>
          <tr>
            <th>
              word <i>({halfWords.length})</i>
            </th>
            <th>context</th>
            <th>source</th>
            <th>time</th>
          </tr>
        </thead>
        <tbody>
          {!halfWords.length && (
            <tr>
              <td colSpan={4} align="center">
                😭 no word yet.
              </td>
            </tr>
          )}
          {halfWords.map(item => {
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
