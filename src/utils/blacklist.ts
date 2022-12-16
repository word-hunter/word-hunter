import { Messages, StorageKey } from '../constant'

export async function readBlacklist() {
  return new Promise<string[]>(resolve => {
    chrome.storage.local.get(StorageKey.blacklist, result => {
      resolve(result[StorageKey.blacklist] ?? [])
    })
  })
}

const toggleBlacklist = async () => {
  const host = location.host
  const blacklist = await readBlacklist()
  const newBlacklist = blacklist.includes(host) ? blacklist.filter(h => h !== host) : [...blacklist, host]
  updateBlacklist(newBlacklist)
}

const updateBlacklist = (blacklist: string[]) => {
  chrome.storage.local.set({ [StorageKey.blacklist]: blacklist }, () => {
    updateAppIcon()
  })
}

const updateAppIcon = () => {
  if (!document.hidden && !chrome.tabs) {
    readBlacklist().then(blacklist => {
      chrome.runtime.sendMessage({ [Messages.app_available]: !blacklist.includes(location.host) })
    })
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateAppIcon()
  }
})

readBlacklist().then(updateAppIcon)

window.__toggleBlackList = toggleBlacklist
