import { settings, setSetting } from '../lib'

export const CnTransSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('showCnTrans', target.checked)
  }

  return (
    <section class="section">
      <div class="flex justify-end">
        <label for="showCnTrans" class="label gap-4 cursor-pointer ">
          <span class="text-xs">show Chinese translation</span>
          <input
            class="toggle dark:toggle-info toggle-sm"
            type="checkbox"
            name="showCnTrans"
            id="showCnTrans"
            checked={settings().showCnTrans}
            oninput={onInput}
          />
        </label>
      </div>
    </section>
  )
}
