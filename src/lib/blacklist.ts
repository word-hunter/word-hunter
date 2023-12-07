import { Messages, StorageKey } from '../constant'
import { getSyncValue, getLocalValue } from './storage'
import { DEFAULT_SETTINGS } from './settings'

export const readBlacklist = async () => {
  const settings = (await getSyncValue(StorageKey.settings)) ?? DEFAULT_SETTINGS
  const blacklist = settings.blacklist ?? []
  return Array.isArray(blacklist) ? blacklist : []
}

const updateAppIcon = async () => {
  if (document.visibilityState !== 'hidden' && !chrome.tabs && window.top === window.self) {
    const blacklist = await readBlacklist()
    const shouldAvailable = !blacklist.includes(top?.location.host)
    const isAppAvailable = (await getLocalValue(Messages.app_available as unknown as StorageKey)) ?? true
    if (isAppAvailable !== shouldAvailable) {
      chrome.runtime.sendMessage({ [Messages.app_available]: shouldAvailable })
    }
  }
}

document.addEventListener('visibilitychange', () => {
  updateAppIcon()
})

// register in context script and for call in popup page
if (typeof window !== 'undefined') {
  window.__updateAppIcon = updateAppIcon
}

updateAppIcon()
