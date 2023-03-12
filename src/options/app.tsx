import styles from './app.module.less'
import { Backup } from './backup'
import { MaxHighlightSetting } from './maxHighlight'

export const App = () => {
  return (
    <div class={styles.page}>
      <Backup />
      <MaxHighlightSetting />
    </div>
  )
}
