import { settings, setSetting } from '../lib'
import { Note } from './note'

export const ControlSetting = () => {
  const onKeyChange = (e: Event) => {
    const target = e.target as HTMLSelectElement
    setSetting('mosueKey', target.value as any)
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
            value={settings().mosueKey}
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
    </section>
  )
}
