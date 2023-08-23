import { CollinsDict } from './collins'
import { GoogleDict } from './google'
import { OpenAiDict } from './openai'
import { LongManDict } from './longman'

export type { Adapter } from './type'

export const adapters = {
  collins: new CollinsDict(),
  google: new GoogleDict(),
  longman: new LongManDict(),
  openai: new OpenAiDict()
}

export type AdapterKey = keyof typeof adapters
