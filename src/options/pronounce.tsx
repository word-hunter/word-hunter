import { settings, setSetting } from '../lib'

export const PronounceSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('atuoPronounce', target.checked)
  }

  return (
    <section class="section">
      <h2 class="h2">Pronounce</h2>
      <div class="flex justify-end">
        <label for="pronounce" class="label gap-4 cursor-pointer ">
          <span class="label-text">auto pronounce</span>
          <input
            class="toggle toggle-info"
            type="checkbox"
            name="pronounce"
            id="pronounce"
            checked={settings().atuoPronounce}
            oninput={onInput}
          />
        </label>
      </div>
    </section>
  )
}
