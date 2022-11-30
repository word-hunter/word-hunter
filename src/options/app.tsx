import styles from './app.module.less'
import { Backup } from './backup'

export const App = () => {
  return (
    <div class={styles.page}>
      <Backup />
    </div>
  )
}
