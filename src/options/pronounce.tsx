import { settings, setSetting } from '../lib'

export const PronounceSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('autoPronounce', target.checked)
  }

  const onVolumeChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('volume', target.valueAsNumber)
  }

  return (
    <section class="section">
      <div class="flex justify-end">
        <label for="pronounce" class="label gap-4 cursor-pointer ">
          <span class="text-xs">auto pronounce</span>
          <input
            class="toggle dark:toggle-info toggle-sm"
            type="checkbox"
            name="pronounce"
            id="pronounce"
            checked={settings().autoPronounce}
            oninput={onInput}
          />
        </label>
      </div>
      <div>
        <label class="block pt-4 pb-4 text-right">pronounce volume ({settings().volume})</label>
        <input
          type="range"
          min="0"
          max="100"
          value={settings().volume}
          step="1"
          class="range dark:range-info range-xs"
          oninput={onVolumeChange}
        />
      </div>
    </section>
  )
}
