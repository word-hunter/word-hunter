import { Messages } from '../constant'
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

export async function sendMessage(action: Messages, data: object): Promise<any> {
  const port = getMessagePort()

  return new Promise((resolve, _reject) => {
    const messageHandler = (msg: any) => {
      if (msg[action]) {
        resolve(msg)
      }
      port.onMessage.removeListener(messageHandler)
    }

    port.postMessage({ action: action, ...data })
    port.onMessage.addListener(messageHandler)
  })
}
