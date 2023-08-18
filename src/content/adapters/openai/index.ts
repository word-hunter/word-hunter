// reference: https://github.com/crimx/ext-saladict/blob/dev/src/components/dictionaries/googledict/engine.ts

import dictStyles from './index.less?inline'
import type { Adapter } from '../type'
import { Messages } from '../../../constant'
import { sendMessage } from '../../../lib/port'

const cache: Record<string, string> = {}

export class OpenAiDict implements Adapter {
  readonly name = 'openai'
  readonly host = 'https://api.openai.com/v1/completions'
  readonly apiBase = `${this.host}`
  readonly sectionSelector = ''

  get style() {
    return dictStyles
  }

  async lookup({ word, text }: { word: string; text?: string }) {
    if (cache[word]) return Promise.resolve(cache[word])
    try {
      const html = await fetchExplain(word, text)
      const data = html
      cache[word] = data
      return data
    } catch (e) {
      console.warn(e)
      return ''
    }
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
