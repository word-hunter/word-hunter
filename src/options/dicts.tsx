import { Index } from 'solid-js'
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
        <Index each={Object.entries(settings()['dictTabs'])}>
          {(dict, i) => {
            return (
              <label for={dict()[0]} class="label cursor-pointer gap-4">
                <span class="label-text"> {dict()[0]}</span>
                <input
                  type="checkbox"
                  class="toggle toggle-info"
                  name="dicts"
                  id={dict()[0]}
                  value={dict()[0]}
                  checked={dict()[1]}
                  oninput={onInput}
                />
              </label>
            )
          }}
        </Index>
      </div>
    </section>
  )
}
