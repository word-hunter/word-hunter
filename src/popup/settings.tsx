import styles from './settings.module.less'
import { colors, updateColors } from '../utils/color'

export const Settings = () => {
  const onColorChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newColors = [...colors()]
    newColors[Number(target.dataset.index)] = target?.value
    updateColors(newColors)
  }

  return (
    <div class={styles.container}>
      <div class={styles.colorSetting}>
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
      </div>
    </div>
  )
}
