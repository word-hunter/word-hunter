import { settings, setSetting } from '../lib'

export const MaxHighlightSetting = () => {
  const onMaxChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newMax = Number(target.value)
    setSetting('maxHighlight', newMax)
  }

  return (
    <section class="section">
      <h2 class="h2">Max Highlights</h2>
      <div class="flex justify-end">
        <input
          class="input input-bordered"
          type="number"
          min={1}
          value={settings()['maxHighlight']}
          oninput={onMaxChange}
        />
      </div>
    </section>
  )
}
