import { settings, setSetting } from '../lib'
import { Note } from './note'

export const ControlSetting = () => {
  const onKeyChange = (e: Event) => {
    const target = e.target as HTMLSelectElement
    setSetting('mouseKey', target.value as any)
  }

  const onVolumeChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('mouseHideDelay', target.valueAsNumber)
  }

  return (
    <section class="section">
      <h2 class="h2">
        Control Keys<Note>Choose the key when mouse over word to show dict window</Note>
      </h2>
      <div class="flex flex-col items-end gap-4">
        <div>
          <select
            class="select select-bordered select-sm w-full max-w-xs text-xs"
            oninput={onKeyChange}
            value={settings().mouseKey}
            aria-placeholder="select key"
          >
            <option disabled>Select Key</option>
            <option value="NONE">None</option>
            <option value="ctrlKey">⌃ Ctrl</option>
            <option value="altKey">⌥ Alt</option>
            <option value="metaKey">⌘ Command</option>
            <option value="shiftKey">⇧ Shift</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block pt-4 pb-4 text-right">card hide delay ({settings().mouseHideDelay}ms)</label>
        <input
          type="range"
          min="0"
          max="1000"
          value={settings().mouseHideDelay}
          step="1"
          class="range dark:range-info range-xs"
          oninput={onVolumeChange}
        />
      </div>
    </section>
  )
}
