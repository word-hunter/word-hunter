import styles from './settings.module.less'
import { colors, updateColors } from '../utils/color'
import { maxHighlight, updateMaxHighlight } from '../utils/maxHighlight'

export const Settings = () => {
  const onColorChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newColors = [...colors()]
    newColors[Number(target.dataset.index)] = target?.value
    updateColors(newColors)
  }

  const onMaxChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newMax = Number(target.value)
    updateMaxHighlight(newMax)
  }

  const onDirectToOption = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') })
    return false
  }

  return (
    <div class={styles.container}>
      <section>
        <h4>Color Setting:</h4>
        <div class={styles.colorInputs}>
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
      <section>
        <h4>Max highlight count:</h4>
        <div class={styles.colorInputs}>
          <div>
            <label>max:</label>
            <input type="number" min={1} value={maxHighlight()} oninput={onMaxChange} />
          </div>
        </div>
      </section>
      <section>
        <h4>Backup:</h4>
        <div class={styles.backup}>
          <a onclick={onDirectToOption} href="#">
            Go to backup ↗
          </a>
        </div>
      </section>
    </div>
  )
}
