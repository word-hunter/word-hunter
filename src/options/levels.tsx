import { For } from 'solid-js'
import { settings, setSetting } from '../lib'
import { Levels, LevelKey } from '../constant'
import { Note } from './note'

export const LevelSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const level = target.value as LevelKey
    if (target.checked && !settings().levels.includes(level)) {
      setSetting('levels', [...settings().levels, level])
    } else {
      setSetting(
        'levels',
        settings().levels.filter(item => item !== level)
      )
    }
  }

  return (
    <section class="section">
      <h2 class="h2">
        Levels<Note>Select the Dicts used for highlight</Note>
      </h2>
      <div>
        <div class="form-control flex flex-col items-end">
          <For each={Levels}>
            {item => {
              return (
                <label class="label cursor-pointer gap-4 max-w-fit">
                  <span class="text-xs">{item[1]}</span>
                  <input
                    id={item[0]}
                    type="checkbox"
                    class="toggle dark:toggle-info toggle-sm"
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
