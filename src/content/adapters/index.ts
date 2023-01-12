import { CollinsDict } from './collins'

export type { Adapter } from './type'

export const adapters = {
  collins: new CollinsDict()
}
