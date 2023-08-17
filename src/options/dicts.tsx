import { For } from 'solid-js'
import { settings, setSetting } from '../lib'

export const DictsSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newDicts = { ...settings()['dictTabs'], [target.value]: target.checked }
    setSetting('dictTabs', newDicts)
  }

  return (
    <section class="section">
      <h2 class="h2">Dicts</h2>
      <div class="flex flex-col items-end">
        <For each={Object.entries(settings()['dictTabs'])}>
          {([key, value]) => {
            return (
              <label for={key} class="label cursor-pointer gap-4">
                <span class="label-text"> {key}</span>
                <input
                  type="checkbox"
                  class="toggle toggle-info"
                  name="dicts"
                  id={key}
                  value={key}
                  checked={value}
                  oninput={onInput}
                />
              </label>
            )
          }}
        </For>
      </div>
    </section>
  )
}
