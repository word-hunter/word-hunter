import { settings, setSetting } from '../lib'

export const MaxHighlightSetting = () => {
  const onMaxChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newMax = Number(target.value)
    setSetting('maxHighlight', newMax)
  }

  return (
    <section>
      <h2>Max highlight count:</h2>
      <div>
        <div>
          <input type="number" min={1} value={settings()['maxHighlight']} oninput={onMaxChange} />
        </div>
      </div>
    </section>
  )
}
