import { settings, setSetting } from '../lib'
import styles from './dicts.module.less'

export const PronounceSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('atuoPronounce', target.checked)
  }

  return (
    <section>
      <h2>Pronounce:</h2>
      <div class={styles.section_item}>
        <div class={styles.checkbox_item}>
          <div>
            <input
              type="checkbox"
              name="pronounce"
              id="pronounce"
              checked={settings().atuoPronounce}
              oninput={onInput}
            />
            <label for="pronounce">auto pronounce</label>
          </div>
        </div>
      </div>
    </section>
  )
}
