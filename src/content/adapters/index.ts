import { CollinsDict } from './collins'
import { GoogleDict } from './google'

export type { Adapter } from './type'

export const adapters = {
  collins: new CollinsDict(),
  google: new GoogleDict()
}
