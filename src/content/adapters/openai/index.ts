// reference: https://github.com/crimx/ext-saladict/blob/dev/src/components/dictionaries/googledict/engine.ts

import dictStyles from './index.css?inline'
import type { Adapter } from '../type'
import { Messages } from '../../../constant'
import { sendMessage } from '../../../lib/port'
import { Cache } from '../cache'

const cache = new Cache()

export class OpenAiDict implements Adapter {
  readonly name = 'openai'
  readonly host = 'https://api.openai.com/v1/completions'
  readonly apiBase = `${this.host}`
  readonly sectionSelector = ''

  get style() {
    return dictStyles
  }

  async lookup({ word, text }: { word: string; text?: string; isPreload?: boolean }) {
    if (cache.get(word)) return Promise.resolve(cache.get(word)!)
    const html = await fetchExplain(word, text)
    const data = html
    cache.set(word, data)
    return data
  }

  getPageUrl(word: string) {
    return ''
  }

  getWordByHref(href: string) {
    return ''
  }
}

export async function fetchExplain(word: string, text?: string): Promise<string> {
  const result = await sendMessage(Messages.ai_explain, { word, text })
  return result ?? ''
}
