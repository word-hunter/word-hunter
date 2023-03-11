import styles from './settings.module.less'
import { colors, updateColors } from '../utils/color'
import { maxHighlight, updateMaxHighlight } from '../utils/maxHighlight'
import { apiKey, setApiKey } from '../utils/openai'

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

  const onApiKeyChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    setApiKey(target.value)
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
      <section>
        <h4>OpenAI-APIKey:</h4>
        <div class={styles.section_item}>
          <div>
            <input type="text" value={apiKey()} oninput={onApiKeyChange} />
          </div>
        </div>
      </section>
      <section>
        <h4>Backup:</h4>
        <div class={styles.section_item}>
          <div>
            <a onclick={onDirectToOption} href="#">
              more settings ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
