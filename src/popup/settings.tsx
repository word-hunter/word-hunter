import styles from './settings.module.css'
import { classes } from '../constant'
import { settings, setSetting, MarkStyles, genMarkStyle } from '../lib'
import { For } from 'solid-js'

export const Settings = () => {
  const onColorChange = (e: Event) => {
    const colors = settings()['colors']
    const target = e.target as HTMLInputElement
    colors[Number(target.dataset.index)] = target?.value
    setSetting('colors', colors)
  }

  const onDirectToOption = async () => {
    if (chrome.sidePanel?.open) {
      const win = await chrome.windows.getCurrent()
      window.close()
      chrome.sidePanel.open({ windowId: win.id })
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') })
    }
    return false
  }

  const onMarkStyleChanged = (e: Event) => {
    const target = e.target as HTMLSelectElement
    setSetting('markStyle', target.value as typeof MarkStyles[number])
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

      <section>
        <h4>
          <span classList={{ [classes.unknown]: true, [classes.mark]: true }}>Mark</span> style:
        </h4>
        <div class={styles.section_item}>
          <select value={settings().markStyle} onChange={onMarkStyleChanged}>
            <For each={MarkStyles}>
              {item => (
                <option id={item} value={item}>
                  {item}
                </option>
              )}
            </For>
          </select>
        </div>
      </section>

      <div>
        <a onclick={onDirectToOption} href="#">
          more settings ↗
        </a>
      </div>
      <style>
        {`
          ${genMarkStyle()}
        `}
      </style>
    </div>
  )
}
