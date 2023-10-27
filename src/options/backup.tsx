import { createSignal, Show } from 'solid-js'
import { StorageKey } from '../constant'
import { downloadAsJsonFile, resotreSettings } from '../lib'
import { syncUpKnowns, getLocalValue } from '../lib/storage'
import { Note } from './note'
import { syncWithDrive, getBackupData } from '../lib/backup/sync'
import { isMobile, isValidAuthToken } from '../lib/backup/drive'

export const Backup = () => {
  let dialogRef: HTMLDialogElement
  let fileRef: HTMLInputElement

  const timeFormatter = new Intl.DateTimeFormat('en-US')
  const timeLongFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'long',
    hour12: false
  })

  const [toastSuccess, setToastSuccess] = createSignal('')
  const [toastError, setToastError] = createSignal('')
  const [syning, setSyning] = createSignal(false)
  const [latestSyncTime, setLatestSyncTime] = createSignal(0)
  const [syncFailedMessage, setSyncFailedMessage] = createSignal('')
  const [authToken, setAuthToken] = createSignal('')

  const onAuthTokenInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement
    setAuthToken(target.value)
    if (target.value.trim() === '') {
      chrome.storage.local.remove([StorageKey.mobile_auth_token])
    } else {
      if (isValidAuthToken(target.value)) {
        chrome.storage.local.set({ [StorageKey.mobile_auth_token]: target.value })
      } else {
        toastE('invalid auth token')
      }
    }
  }

  getLocalValue(StorageKey.latest_sync_time).then(time => {
    if (time) {
      setLatestSyncTime(time)
    }
  })

  getLocalValue(StorageKey.sync_failed_message).then(message => {
    if (message) {
      setSyncFailedMessage(message)
    }
  })

  getLocalValue(StorageKey.mobile_auth_token).then(token => {
    if (token) {
      setAuthToken(token)
    }
  })

  const showModal = () => {
    dialogRef.showModal()
  }

  const toastS = (message: string) => {
    setToastSuccess('✅ ' + message)
    setTimeout(() => {
      setToastSuccess('')
    }, 5000)
  }

  const toastE = (message: string) => {
    setToastError('❌ ' + message)
    setTimeout(() => {
      setToastError('')
    }, 5000)
  }

  const onRestore = () => {
    const fileList = fileRef.files
    if (!fileList?.length) {
      toastE('no files')
      return false
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const data = reader.result
      try {
        await restoreData(data as string)
        toastS('restore success')
      } catch (e) {
        toastE('invalid file')
      }
    }
    reader.readAsText(fileList[0])
  }

  const restoreData = async (data: string) => {
    if (typeof data !== 'string') return
    const json = JSON.parse(data)
    if (!json[StorageKey.known]) {
      toastE('invalid file️')
      return
    }
    const updateTime = Date.now()
    await chrome.storage.local.set({
      [StorageKey.context]: json[StorageKey.context] ?? {},
      [StorageKey.context_update_timestamp]: updateTime
    })
    syncUpKnowns(Object.keys(json[StorageKey.known] ?? {}), json[StorageKey.known], updateTime)
    await resotreSettings(json[StorageKey.settings])
  }

  const onBackup = async () => {
    const now = Date.now()
    const fileName = `word_hunter_backup_${timeFormatter.format(now)}_${now}.json`
    const backupData = await getBackupData()
    downloadAsJsonFile(JSON.stringify(backupData), fileName)
  }

  const onDriveSync = async () => {
    if (syning()) return
    setSyning(true)
    try {
      const latestSyncTime = await syncWithDrive(true)
      setLatestSyncTime(latestSyncTime)
      setSyncFailedMessage('')
      setSyning(false)
      toastS('sync success')
    } catch (e: any) {
      setSyning(false)
      setSyncFailedMessage(e.message)
      toastE('sync failed: ️' + e.message)
    }
  }

  return (
    <>
      <section class="section">
        <h2 class="h2">
          Backup<Note>Automatically sync between Chromes (without context data)</Note>
        </h2>
        <dialog id="restoreDialog" ref={dialogRef!} class="modal">
          <form method="dialog" class="modal-box">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
            <div class="pt-10">
              <input
                type="file"
                accept=".json"
                ref={fileRef!}
                class="file-input file-input-bordered file-input-xs sm:file-input-sm w-full"
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

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <button onclick={showModal} class="btn btn-block btn-lg capitalize text-xs">
            ️<img src={chrome.runtime.getURL('icons/upload.png')} class="w-8 h-8" alt="upload" />
            restore
          </button>
          <button onclick={onBackup} class="btn btn-block btn-lg capitalize text-xs">
            ️<img src={chrome.runtime.getURL('icons/download.png')} class="w-8 h-8" alt="backup" />
            backup
          </button>
        </div>

        <div class="divider">OR</div>

        <div class="grid gap-4 pt-1 pb-2">
          <Show when={isMobile}>
            <textarea
              placeholder="Only for Mobile browser:\n Run `await chrome.identity.getAuthToken()` in Desktop Chrome console in option page to get the token, then paste it here."
              class="textarea textarea-bordered textarea-lg w-full h-24 text-sm leading-5"
              classList={{ 'textarea-error': !!authToken() && !isValidAuthToken(authToken()) }}
              value={authToken()}
              oninput={onAuthTokenInput}
            />
          </Show>
          <button onclick={onDriveSync} class="btn btn-block btn-lg capitalize text-xs">
            <img
              src={chrome.runtime.getURL('icons/gdrive.png')}
              classList={{ 'animate-spin': syning() }}
              class="w-8 h-8"
              alt="upload"
            />
            Google Drive Sync
          </button>

          <Show when={latestSyncTime() > 0 && !syncFailedMessage()}>
            <div class="text-center text-accent">Latest sync: {timeLongFormatter.format(latestSyncTime())}</div>
          </Show>
          <Show when={!!syncFailedMessage()}>
            <div class="text-center text-error">❌ Sync Failed: {syncFailedMessage()}</div>
          </Show>
        </div>
      </section>
      <Show when={toastSuccess()}>
        <div class="toast toast-end toast-bottom">
          <div class="alert alert-success">
            <span>{toastSuccess()}</span>
          </div>
        </div>
      </Show>
      <Show when={toastError()}>
        <div class="toast toast-end toast-bottom">
          <div class="alert alert-error">
            <span>{toastError()}</span>
          </div>
        </div>
      </Show>
    </>
  )
}
