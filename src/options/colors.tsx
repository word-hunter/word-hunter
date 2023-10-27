import { settings, setSetting, MarkStyles } from '../lib'
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
    setSetting('markStyle', target.value as typeof MarkStyles[number])
  }

  // for the breaking change of removing depleted markStyles
  const resolvedMarkStyle = () => {
    const s = settings().markStyle
    if (!MarkStyles.includes(s)) {
      return MarkStyles[0]
    }
    return s
  }

  return (
    <>
      <section class="section">
        <h2 class="h2">Highlights</h2>
        <div class="flex flex-col items-end gap-2">
          <div class="flex items-center gap-2">
            <label>Unknown:</label>
            <input
              class="rounded-sm w-8 h-8"
              type="color"
              data-index="0"
              value={settings()['colors'][0]}
              oninput={onColorChange}
            />
          </div>
          <div class="flex items-center gap-2">
            <label>Have context:</label>
            <input
              class="rounded-sm w-8 h-8"
              type="color"
              data-index="1"
              value={settings()['colors'][1]}
              oninput={onColorChange}
            />
          </div>
          <div class="flex items-center gap-2">
            <label>Style:</label>
            <select
              class="select select-bordered select-sm max-w-xs text-xs"
              value={resolvedMarkStyle()}
              onChange={onMarkStyleChanged}
            >
              <For each={MarkStyles}>
                {item => (
                  <option id={item} value={item}>
                    {item}
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>
      </section>
    </>
  )
}
