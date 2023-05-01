import { maxHighlight, updateMaxHighlight } from '../utils/maxHighlight'

export const MaxHighlightSetting = () => {
  const onMaxChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newMax = Number(target.value)
    updateMaxHighlight(newMax)
  }

  return (
    <section>
      <h2>Max highlight count:</h2>
      <div>
        <div>
          <input type="number" min={1} value={maxHighlight()} oninput={onMaxChange} />
        </div>
      </div>
    </section>
  )
}
