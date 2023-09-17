import { StorageKey } from '../constant'
import { downloadAsJsonFile, resotreSettings } from '../lib'
import { syncUpKnowns } from '../lib/storage'
import { Note } from './note'

const timeFormatter = new Intl.DateTimeFormat('en-US')

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
    reader.onload = async () => {
      const data = reader.result
      if (typeof data !== 'string') return
      try {
        const json = JSON.parse(data)
        if (!json[StorageKey.known]) {
          alert('invalid file ❗️')
          return
        }

        await chrome.storage.local.set({
          [StorageKey.context]: json[StorageKey.context] ?? {},
          [StorageKey.known]: json[StorageKey.known] ?? {}
        })
        syncUpKnowns(Object.keys(json[StorageKey.known] ?? {}), json[StorageKey.known])
        // if (json[StorageKey.settings]) {
        await resotreSettings(json[StorageKey.settings])
        // }
        alert('restore success ✅')
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
    chrome.storage.local.get([StorageKey.known, StorageKey.context, StorageKey.settings], result => {
      const now = Date.now()
      const fileName = `word_hunter_backup_${timeFormatter.format(now)}_${now}.json`

      // clean up unused context words
      const known = result[StorageKey.known] || {}
      const contexts = result[StorageKey.context] || {}
      const cleanContexts = Object.fromEntries(
        Object.entries(contexts).filter(([word]) => {
          return !(word in known)
        })
      )

      downloadAsJsonFile(
        JSON.stringify({
          [StorageKey.known]: known,
          [StorageKey.context]: cleanContexts,
          [StorageKey.settings]: result[StorageKey.settings] || null
        }),
        fileName
      )
    })
  }

  return (
    <section class="section">
      <h2 class="h2">backup</h2>
      <Note>Automatically sync between devices, but also can do it manually.</Note>
      <dialog id="restoreDialog" ref={dialogRef!} class="modal">
        <form method="dialog" class="modal-box">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          <div class="pt-10">
            <input
              type="file"
              accept=".json"
              ref={fileRef!}
              class="file-input file-input-bordered file-input-lg w-full"
            />
          </div>

          <div class="modal-action">
            <button class="btn btn-outline" onclick={onRestore}>
              confirm
            </button>
          </div>
        </form>
        <form method="dialog" class="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      <div class="grid grid-cols-2 gap-4 pt-1">
        <button onclick={showModal} class="btn btn-block btn-lg">
          ️<img src={chrome.runtime.getURL('icons/upload.png')} class="w-8 h-8" alt="upload" />
          restore
        </button>
        <button onclick={onBackup} class="btn btn-block btn-lg">
          ️<img src={chrome.runtime.getURL('icons/download.png')} class="w-8 h-8" alt="backup" />
          backup
        </button>
      </div>
    </section>
  )
}
