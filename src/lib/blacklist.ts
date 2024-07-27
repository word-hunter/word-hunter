import { Messages, StorageKey } from '../constant'
import { getSyncValue, getLocalValue } from './storage'
import { DEFAULT_SETTINGS } from './settings'
import { isMatchURLPattern } from './utils'
import { sendMessage } from 'webext-bridge/content-script'

export const readBlacklist = async () => {
  const settings = (await getSyncValue(StorageKey.settings)) ?? DEFAULT_SETTINGS
  const blacklist = settings.blacklist ?? []
  return Array.isArray(blacklist) ? blacklist : []
}

const updateAppIcon = async () => {
  if (document.visibilityState !== 'hidden' && window.top === window.self) {
    const blacklist = await readBlacklist()
    const shouldDomainAvailable = !isMatchURLPattern(blacklist, top?.location.host)[0]
    const isAppAvailable = (await getLocalValue(Messages.app_available as unknown as StorageKey)) ?? true
    if (isAppAvailable !== shouldDomainAvailable) {
      sendMessage(Messages.app_available, { app_available: shouldDomainAvailable }, 'background')
    }
  }
}

document.addEventListener('visibilitychange', () => {
  updateAppIcon()
})

chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
  if (namespace === 'sync' && changes[StorageKey.settings]) {
    const { oldValue, newValue } = changes[StorageKey.settings]
    if (JSON.stringify(oldValue?.blacklist) !== JSON.stringify(newValue?.blacklist)) {
      updateAppIcon()
    }
  }
})

updateAppIcon()
