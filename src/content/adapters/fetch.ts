import { Messages } from '../../constant'
import { sendMessage } from '../../lib/port'

export async function fetchText(url: string): Promise<string> {
  const msg = await sendMessage(Messages.fetch_html, { url })
  if (msg.url === url) {
    return msg[Messages.fetch_html]
  }
  return ''
}
