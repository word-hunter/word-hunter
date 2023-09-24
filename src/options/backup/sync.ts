import { StorageKey, WordMap, ContextMap } from '../../constant'
import { mergeKnowns, mergeContexts, cleanupContexts } from '../../lib'
import { SettingType, mergeSettingInOrder, mergeSettings } from '../../lib/settings'
import * as GDrive from './drive'

type BackupData = {
  known: WordMap
  context: ContextMap
  settings: SettingType
  knwon_update_timestamp: number
  context_update_timestamp: number
}

export async function getLocalData(): Promise<BackupData> {
  const result = await chrome.storage.local.get([
    StorageKey.known,
    StorageKey.context,
    StorageKey.settings,
    StorageKey.knwon_update_timestamp,
    StorageKey.context_update_timestamp
  ])
  return {
    [StorageKey.known]: result[StorageKey.known] || {},
    [StorageKey.context]: cleanupContexts(result[StorageKey.context] || {}, result[StorageKey.known] || {}),
    [StorageKey.settings]: result[StorageKey.settings] || null,
    [StorageKey.knwon_update_timestamp]: result[StorageKey.knwon_update_timestamp] ?? 0,
    [StorageKey.context_update_timestamp]: result[StorageKey.context_update_timestamp] ?? 0
  }
}

export async function syncWithDrive() {
  await GDrive.auth(true)
  let dirId = await GDrive.findDirId()
  let fileId = ''
  if (!dirId) {
    dirId = await GDrive.createFolder(GDrive.FOLDER_NAME)
  } else {
    fileId = await GDrive.findFileId(dirId)
  }

  if (fileId) {
    // merge and sync
    const localData = await getLocalData()
    const gdriveData = (await GDrive.downloadFile(fileId)) as BackupData
    const mergedSettings = mergeSettingInOrder([localData[StorageKey.settings], gdriveData[StorageKey.settings]])
    const [mergedKnowns, knwon_update_timestamp] = await mergeKnowns(gdriveData[StorageKey.known])
    const [mergedContexts, context_update_timestamp] = await mergeContexts(
      gdriveData[StorageKey.context],
      gdriveData[StorageKey.context_update_timestamp]
    )
    const mergedData = {
      [StorageKey.known]: mergedKnowns,
      [StorageKey.context]: cleanupContexts(mergedContexts, mergedKnowns),
      [StorageKey.settings]: mergedSettings,
      [StorageKey.knwon_update_timestamp]: knwon_update_timestamp,
      [StorageKey.context_update_timestamp]: context_update_timestamp
    }

    await chrome.storage.local.set(mergedData)
    await mergeSettings()
    const file = new File([JSON.stringify(mergedData)], GDrive.FILE_NAME, { type: 'application/json' })
    await GDrive.uploadFile(file, 'application/json', dirId, fileId)
  } else {
    // just upload
    const localData = await getLocalData()
    const file = new File([JSON.stringify(localData)], GDrive.FILE_NAME, { type: 'application/json' })
    await GDrive.uploadFile(file, 'application/json', dirId)
  }
  const latest_sync_time = Date.now()
  await chrome.storage.local.set({ [StorageKey.latest_sync_time]: latest_sync_time })
  return latest_sync_time
}
