import { settings, setSetting } from '../lib'

export const PronounceSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('atuoPronounce', target.checked)
  }

  const onVolumeChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('volume', target.valueAsNumber)
  }

  return (
    <section class="section">
      <h2 class="h2">Pronounce</h2>
      <div class="flex justify-end">
        <label for="pronounce" class="label gap-4 cursor-pointer ">
          <span class="label-text">auto pronounce</span>
          <input
            class="toggle dark:toggle-info"
            type="checkbox"
            name="pronounce"
            id="pronounce"
            checked={settings().atuoPronounce}
            oninput={onInput}
          />
        </label>
      </div>
      <div>
        <label class="block pt-8 pb-4 text-right">volume ({settings().volume})</label>
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
