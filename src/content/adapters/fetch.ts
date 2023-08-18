import { Messages } from '../../constant'
import { sendMessage } from '../../lib/port'

export async function fetchText(url: string): Promise<string> {
  const result = await sendMessage(Messages.fetch_html, { url })
  return result ?? ''
}
