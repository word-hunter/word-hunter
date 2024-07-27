import { Messages } from '../../constant'
import { sendMessage } from 'webext-bridge/content-script'

export async function fetchText(url: string, isPreload?: boolean): Promise<string> {
  const result = await sendMessage(Messages.fetch_html, { url, isPreload }, 'background')
  if (typeof result === 'string') {
    return result
  } else {
    throw new Error(result.message)
  }
}
