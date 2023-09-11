import { settings, setSetting } from '../lib'

export const CnTransSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('showCnTrans', target.checked)
  }

  return (
    <section class="section">
      <h2 class="h2">Chinese Translation</h2>
      <div class="flex justify-end">
        <label for="showCnTrans" class="label gap-4 cursor-pointer ">
          <span class="label-text">show Chinese translation</span>
          <input
            class="toggle toggle-info"
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
