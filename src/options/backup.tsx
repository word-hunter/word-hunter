import styles from './backup.module.less'
import { WordType } from '../constant'
import { downloadAsJsonFile } from '../utils'

const timeformatter = new Intl.DateTimeFormat('en-US')

export const Backup = () => {
  let dialogRef: HTMLDialogElement
  let fileRef: HTMLInputElement

  const onRestore = () => {
    const fileList = fileRef.files
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
              alert('restore success ✅')
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
    dialogRef.showModal()
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
    <div class={styles.container}>
      <dialog id="restoreDialog" ref={dialogRef!}>
        <form method="dialog">
          <div style={{ 'margin-bottom': '20px' }}>
            <input type="file" accept=".json" ref={fileRef!} />
          </div>
          <button onclick={onRestore}>confirm</button>
        </form>
      </dialog>
      <button onclick={showModal}>restore</button>
      <button onclick={onBackup}>backup</button>
    </div>
  )
}
