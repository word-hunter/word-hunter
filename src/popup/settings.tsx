import styles from './settings.module.less'
import { colors, updateColors } from '../utils/color'

export const Settings = () => {
  const onColorChange = (e: Event) => {
    const newColors = [(e.target as HTMLInputElement)?.value]
    updateColors(newColors)
  }

  return (
    <div class={styles.container}>
      <div class={styles.colorSetting}>
        <h4>Color Setting:</h4>
        <div class={styles.colorInputs}>
          <div>
            <label for="color_unknown">Unknown:</label>
            <input
              type="color"
              id="color_unknown"
              name="color_unknown"
              data-index="0"
              value={colors()[0]}
              oninput={onColorChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
