import { For } from 'solid-js'
import { dictTabs, updateDictTabSettings } from '../utils/dictTabs'
import styles from './dicts.module.less'

export const DictsSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newDicts = { ...dictTabs(), [target.value]: target.checked }
    updateDictTabSettings(newDicts)
  }

  return (
    <section>
      <h2>Dicts:</h2>
      <div class={styles.section_item}>
        <div class={styles.checkbox_item}>
          <For each={Object.entries(dictTabs())}>
            {([key, value]) => {
              return (
                <div>
                  <input type="checkbox" name="dicts" id={key} value={key} checked={value} oninput={onInput} />
                  <label for={key}>{key}</label>
                </div>
              )
            }}
          </For>
        </div>
      </div>
    </section>
  )
}
