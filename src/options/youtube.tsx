import { settings, setSetting } from '../lib'

export const YoutubeSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setSetting('autoPauseYoutubeVideo', target.checked)
  }

  return (
    <section class="section">
      <h2 class="h2">Youtube SubTitle</h2>
      <div class="flex justify-end">
        <label for="pause" class="label gap-4 cursor-pointer ">
          <span class="label-text">auto pause youtube video</span>
          <input
            class="toggle toggle-info"
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
