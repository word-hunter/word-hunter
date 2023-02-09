import { Messages } from '../../constant'
import { getMessagePort } from '../port'

export async function fetchText(url: string): Promise<string> {
  const port = getMessagePort()

  return new Promise((resolve, _reject) => {
    const messageHandler = (msg: any) => {
      if (msg[Messages.fetch_html]) {
        if (msg.url === url) {
          const text = msg[Messages.fetch_html]
          resolve(text)
        }
      }
      port.onMessage.removeListener(messageHandler)
    }

    port.postMessage({ action: Messages.fetch_html, url })
    port.onMessage.addListener(messageHandler)
  })
}
