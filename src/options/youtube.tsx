import { settings, setSetting } from '../lib'

export const YoutubeSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('autoPauseYoutubeVideo', target.checked)
  }

  return (
    <section class="section">
      <div class="flex justify-end">
        <label for="pause" class="label gap-4 cursor-pointer ">
          <span class="text-xs">auto pause youtube video</span>
          <input
            class="toggle dark:toggle-info toggle-sm"
            type="checkbox"
            name="pause"
            id="pause"
            checked={settings().autoPauseYoutubeVideo}
            oninput={onInput}
          />
        </label>
      </div>
    </section>
  )
}
