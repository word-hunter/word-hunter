import { Messages, StorageKey } from '../constant'
import { getSyncValue } from './storage'

export const readBlacklist = async () => {
  const settings = await getSyncValue(StorageKey.settings)
  const blacklist = settings.blacklist ?? []
  return Array.isArray(blacklist) ? blacklist : []
}

const updateAppIcon = async () => {
  if (!document.hidden && !chrome.tabs) {
    const blacklist = await readBlacklist()
    chrome.runtime.sendMessage({ [Messages.app_available]: !blacklist.includes(location.host) })
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
