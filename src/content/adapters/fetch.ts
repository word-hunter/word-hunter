import { Messages } from '../../constant'
import { sendMessage } from '../../lib/port'

export async function fetchText(url: string, isPreload?: boolean): Promise<string> {
  const result: string | { isError: boolean; message: string } = await sendMessage(Messages.fetch_html, {
    url,
    isPreload
  })
  if (typeof result === 'string') {
    return result
  } else {
    throw new Error(result.message)
  }
}
