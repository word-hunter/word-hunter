import styles from './app.module.less'
import { Backup } from './backup'
import { MaxHighlightSetting } from './maxHighlight'
import { DictsSetting } from './dicts'
import { OpenAISetting } from './openai'
import { PronounceSetting } from './pronounce'

export const App = () => {
  return (
    <div class={styles.page}>
      <Backup />
      <MaxHighlightSetting />
      <DictsSetting />
      <OpenAISetting />
      <PronounceSetting />
    </div>
  )
}
