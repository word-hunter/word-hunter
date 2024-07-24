import { settings, setSetting } from '../lib'

export const PreloadSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('preload', target.checked)
  }

  return (
    <section class="section">
      <div class="flex justify-end">
        <label for="preload" class="label gap-4 cursor-pointer ">
          <span class="text-xs">preload words definition</span>
          <input
            class="toggle dark:toggle-info toggle-sm"
            type="checkbox"
            name="preload"
            id="preload"
            checked={settings().preload}
            oninput={onInput}
          />
        </label>
      </div>
    </section>
  )
}
