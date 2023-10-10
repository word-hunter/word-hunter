import { classes } from '../constant'
import { settings, setSetting, MarkStyles, genMarkStyle } from '../lib'
import { For } from 'solid-js'

export const ColorsSetting = () => {
  const onColorChange = (e: Event) => {
    const colors = settings()['colors']
    const target = e.target as HTMLInputElement
    colors[Number(target.dataset.index)] = target?.value
    setSetting('colors', colors)
  }

  const onMarkStyleChanged = (e: Event) => {
    const target = e.target as HTMLSelectElement
    setSetting('markStyle', target.value as (typeof MarkStyles)[number])
  }

  return (
    <>
      <section class="section">
        <h2 class="h2">Colors</h2>
        <div class="flex flex-col items-end gap-4">
          <div class="flex items-center gap-2">
            <label>Unknown:</label>
            <input
              class="rounded-sm"
              type="color"
              data-index="0"
              value={settings()['colors'][0]}
              oninput={onColorChange}
            />
          </div>
          <div class="flex items-center gap-2">
            <label>Have context:</label>
            <input
              class="rounded-sm"
              type="color"
              data-index="1"
              value={settings()['colors'][1]}
              oninput={onColorChange}
            />
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="h2">
          <span class="z-0" classList={{ [classes.unknown]: true, [classes.mark]: true }}>
            Mark
          </span>{' '}
          style:
        </h2>
        <div class="flex flex-col items-end gap-4 mt-4">
          <select class="select select-bordered max-w-xs" value={settings().markStyle} onChange={onMarkStyleChanged}>
            <For each={MarkStyles}>
              {item => (
                <option id={item} value={item}>
                  {item}
                </option>
              )}
            </For>
          </select>
        </div>
        <style>
          {`
          ${genMarkStyle()}
        `}
        </style>
      </section>
    </>
  )
}
