import styles from './app.module.less'
import { Backup } from './backup'
import { Wordbook } from './wordbook'

export const App = () => {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Word book</h1>
      <div className={styles.toolbar}>
        <Backup />
      </div>
      <Wordbook />
    </div>
  )
}
