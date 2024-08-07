import { createSignal, Show } from 'solid-js'
import { StorageKey } from '../constant'
import { downloadAsJsonFile, resotreSettings } from '../lib'
import { syncUpKnowns, getLocalValue } from '../lib/storage'
import { Note } from './note'
import { syncWithDrive, getBackupData, syncWithGist } from '../lib/backup/sync'
import { formatTime } from '../lib/utils'
import { isMobile, isValidAuthToken } from '../lib/backup/drive'

export const Backup = () => {
  const [toastSuccess, setToastSuccess] = createSignal('')
  const [toastError, setToastError] = createSignal('')
  const [syning, setSyning] = createSignal(false)
  const [latestSyncTime, setLatestSyncTime] = createSignal(0)
  const [syncFailedMessage, setSyncFailedMessage] = createSignal('')
  const [authToken, setAuthToken] = createSignal('')
  const [githubSyning, setGithubSyning] = createSignal(false)
  const [githubToken, setGithubToken] = createSignal('')
  const [githubGistId, setGithubGistId] = createSignal('')
  const [latestGistSyncTime, setLatestGistSyncTime] = createSignal(0)
  const [gistSyncFailedMessage, setGistSyncFailedMessage] = createSignal('')

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

  const onGithubTokenInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setGithubToken(target.value)
  }

  const onGithubGistIdInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setGithubGistId(target.value)
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

  getLocalValue(StorageKey.github_token).then(token => {
    if (token) {
      setGithubToken(token)
    }
  })

  getLocalValue(StorageKey.github_gist_id).then(gistId => {
    if (gistId) {
      setGithubGistId(gistId)
    }
  })

  getLocalValue(StorageKey.latest_gist_sync_time).then(time => {
    if (time) {
      setLatestGistSyncTime(time)
    }
  })

  getLocalValue(StorageKey.gist_sync_failed_message).then(message => {
    if (message) {
      setGistSyncFailedMessage(message)
    }
  })

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
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
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
      reader.readAsText(file)
    }
    input.click()
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
    const fileName = `word_hunter_backup_${formatTime(now).replaceAll('/', '_')}_${now}.json`
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

  const onGithubGistSync = async () => {
    if (githubSyning()) return
    const token = githubToken()
    const gistId = githubGistId()
    if (!token || !gistId) {
      toastE('invalid token or gist id')
      return
    }
    setGithubSyning(true)
    try {
      const latestSyncTime = await syncWithGist(token, gistId)
      setLatestGistSyncTime(latestSyncTime)
      setGistSyncFailedMessage('')
      toastS('sync success')
    } catch (e: any) {
      setGistSyncFailedMessage(e.message)
      toastE('Error during sync settings: ' + e.message)
    } finally {
      setGithubSyning(false)
    }
  }

  return (
    <>
      <section class="section">
        <h2 class="h2">
          Backup<Note>Automatically sync between Chromes (without context data)</Note>
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <button onclick={onRestore} class="btn btn-block btn-lg capitalize text-xs">
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
            <div class="text-center text-accent">Latest sync: {formatTime(latestSyncTime())}</div>
          </Show>
          <Show when={!!syncFailedMessage()}>
            <div class="text-center text-error">❌ Sync Failed: {syncFailedMessage()}</div>
          </Show>
        </div>

        <div class="divider">OR</div>

        <div class="grid gap-4 pt-1 pb-2">
          <input
            type="text"
            class="input"
            placeholder="Github Token"
            value={githubToken()}
            oninput={onGithubTokenInput}
          />
          <input
            type="text"
            class="input"
            placeholder="GitHub Gist Id"
            value={githubGistId()}
            oninput={onGithubGistIdInput}
          />
          <button class="btn btn-block btn-lg capitalize text-xs" onclick={onGithubGistSync}>
            <img
              src={chrome.runtime.getURL('icons/github.png')}
              classList={{ 'animate-spin': githubSyning() }}
              class="w-8 h-8"
              alt="github"
            />
            Github Gist Sync
          </button>
          <Show when={latestGistSyncTime() > 0 && !gistSyncFailedMessage()}>
            <div class="text-center text-accent">Latest sync: {formatTime(latestGistSyncTime())}</div>
          </Show>
          <Show when={githubToken() && githubGistId() && !!gistSyncFailedMessage()}>
            <div class="text-center text-error">❌ Sync Failed: {gistSyncFailedMessage()}</div>
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
