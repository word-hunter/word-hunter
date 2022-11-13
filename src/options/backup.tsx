import { useRef } from 'react'

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

        if (!json[WordType.half] || !json[WordType.known]) {
          alert('invalid file ❗️')
          return
        }

        chrome.storage.local.get([WordType.half, WordType.known], resule => {
          const half = resule[WordType.half] || {}
          const known = resule[WordType.known] || {}

          const newHalf = { ...half, ...json[WordType.half] }
          const newKnown = { ...known, ...json[WordType.known] }

          chrome.storage.local.set(
            {
              [WordType.half]: newHalf,
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
    chrome.storage.local.get([WordType.half, WordType.known], result => {
      downloadAsJsonFile(
        JSON.stringify({
          [WordType.half]: result[WordType.half],
          [WordType.known]: result[WordType.known]
        }),
        `word_hunter_backup_${timeformatter.format(Date.now())}.json`
      )
    })
  }

  return (
    <>
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
    </>
  )
}
