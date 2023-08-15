import styles from './settings.module.less'
import { settings, setSetting } from '../lib'

export const Settings = () => {
  const onColorChange = (e: Event) => {
    const colors = settings()['colors']
    const target = e.target as HTMLInputElement
    colors[Number(target.dataset.index)] = target?.value
    setSetting('colors', colors)
  }

  const onDirectToOption = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') })
    return false
  }

  return (
    <div class={styles.container}>
      <section>
        <h4>Color Setting:</h4>
        <div class={styles.section_item}>
          <div>
            <label>Unknown:</label>
            <input type="color" data-index="0" value={settings()['colors'][0]} oninput={onColorChange} />
          </div>
          <div>
            <label>Have context:</label>
            <input type="color" data-index="1" value={settings()['colors'][1]} oninput={onColorChange} />
          </div>
        </div>
      </section>
      <div>
        <a onclick={onDirectToOption} href="#">
          more settings ↗
        </a>
      </div>
    </div>
  )
}
