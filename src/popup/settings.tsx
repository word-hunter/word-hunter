import styles from './settings.module.less'
import { colors, updateColors } from '../utils/color'

export const Settings = () => {
  const onColorChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newColors = [...colors()]
    newColors[Number(target.dataset.index)] = target?.value
    updateColors(newColors)
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
            <input type="color" data-index="0" value={colors()[0]} oninput={onColorChange} />
          </div>
          <div>
            <label>Have context:</label>
            <input type="color" data-index="1" value={colors()[1]} oninput={onColorChange} />
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
