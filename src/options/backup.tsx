import { useRef } from 'react'

import styles from './backup.module.less'
import { WordType } from '../constant'
import { downloadAsJsonFile } from '../utils'

const timeformatter = new Intl.DateTimeFormat('en-US')

export const Backup = () => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onRestore = () => {
    const fileList = fileRef.current?.files
    if (!fileList?.length) {
      alert('no files')
      return false
    }

    const reader = new FileReader()
    reader.onload = () => {
      const data = reader.result
      if (typeof data !== 'string') return
      try {
        const json = JSON.parse(data)

        if (!json[WordType.known]) {
          alert('invalid file ❗️')
          return
        }

        chrome.storage.local.get([WordType.known], resule => {
          const known = resule[WordType.known] || {}

          const newKnown = { ...known, ...json[WordType.known] }

          chrome.storage.local.set(
            {
              ['half']: {},
              [WordType.known]: newKnown
            },
            () => {
              alert('restore success ✅ \n will reload this page')
              window.location.reload()
            }
          )
        })
      } catch (e) {
        alert('invalid file ❗️')
      }
    }
    reader.readAsText(fileList[0])
  }

  const showModal = () => {
    dialogRef.current?.showModal()
  }

  const onBackup = () => {
    chrome.storage.local.get([WordType.known], result => {
      const now = Date.now()
      const fileName = `word_hunter_backup_${timeformatter.format(now)}_${now}.json`
      downloadAsJsonFile(
        JSON.stringify({
          [WordType.known]: result[WordType.known]
        }),
        fileName
      )
    })
  }

  return (
    <div className={styles.container}>
      <dialog id="restoreDialog" ref={dialogRef}>
        <form method="dialog">
          <div style={{ marginBottom: '20px' }}>
            <input type="file" accept=".json" ref={fileRef} />
          </div>
          <button onClick={onRestore}>confirm</button>
        </form>
      </dialog>
      <button onClick={showModal}>restore</button>
      <button onClick={onBackup}>backup</button>
    </div>
  )
}
