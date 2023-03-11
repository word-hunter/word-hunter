import { CollinsDict } from './collins'
import { GoogleDict } from './google'
import { OpenAiDict } from './openai'

export type { Adapter } from './type'

export const adapters = {
  collins: new CollinsDict(),
  google: new GoogleDict(),
  openai: new OpenAiDict()
}
