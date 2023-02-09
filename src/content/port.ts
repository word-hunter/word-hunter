let messagePort: chrome.runtime.Port

function connectPort() {
  messagePort = chrome.runtime.connect({ name: 'word-hunter' })
  messagePort.onDisconnect.addListener(() => {
    connectPort()
  })
}

connectPort()

export function getMessagePort() {
  return messagePort
}
