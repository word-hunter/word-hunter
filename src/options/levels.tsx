import { For, createEffect } from 'solid-js'
import { settings, setSetting } from '../lib'
import { Levels, LevelKey } from '../constant'

export const LevelSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const level = target.value as LevelKey
    console.log(level, target.checked)
    if (target.checked && !settings().levels.includes(level)) {
      setSetting('levels', [...settings().levels, level])
    } else {
      setSetting(
        'levels',
        settings().levels.filter(item => item !== level)
      )
    }
  }

  createEffect(() => {
    console.log(settings().levels)
  })

  return (
    <section class="section">
      <h2 class="h2">Levels</h2>
      <div class="alert my-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span>Select the Dicts used for highlight</span>
      </div>
      <div>
        <div class="form-control flex flex-col items-end">
          <For each={Levels}>
            {item => {
              return (
                <label class="label cursor-pointer gap-4 max-w-fit">
                  <span class="label-text">{item[1]}</span>
                  <input
                    id={item[0]}
                    type="checkbox"
                    class="toggle toggle-info"
                    checked={settings().levels.includes(item[0])}
                    value={item[0].toString()}
                    oninput={onInput}
                  />
                </label>
              )
            }}
          </For>
        </div>
      </div>
    </section>
  )
}
