import { settings, setSetting } from '../lib'

export const OpenAISetting = () => {
  const onApiKeyChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const openai = settings().openai
    setSetting('openai', { ...openai, apiKey: target.value })
  }

  const onModelChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const openai = settings().openai
    setSetting('openai', { ...openai, model: target.value })
  }

  return (
    <section class="section">
      <h2 class="h2">OpenAI</h2>
      <div class="flex flex-col items-end gap-4">
        <div>
          <select
            class="select select-bordered w-full max-w-xs"
            oninput={onModelChange}
            value={settings().openai.model}
            aria-placeholder="select model"
          >
            <option disabled>Select Model</option>
            <option value="text-davinci-003">text-davinci-003</option>
            <option value="gpt-4">gpt-4</option>
          </select>
        </div>
        <div>
          <textarea
            placeholder="input your openai apikey"
            class="textarea textarea-bordered textarea-lg w-full max-w-xs text-sm leading-5"
            style={{ width: '350px', height: '100px' }}
            value={settings()['openai'].apiKey}
            oninput={onApiKeyChange}
          />
        </div>
      </div>
    </section>
  )
}
