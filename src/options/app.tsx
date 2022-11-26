import styles from './app.module.less'
import { Backup } from './backup'

export const App = () => {
  return (
    <div className={styles.page}>
      <Backup />
    </div>
  )
}
