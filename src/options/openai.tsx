import { settings, setSetting } from '../lib'

export const OpenAISetting = () => {
  const onApiKeyChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const openai = settings().openai
    setSetting('openai', { ...openai, apiKey: target.value })
  }

  const onPromptChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const openai = settings().openai
    setSetting('openai', { ...openai, prompt: target.value })
  }

  const onModelChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const openai = settings().openai
    setSetting('openai', { ...openai, model: target.value })
  }

  return (
    <section class="section">
      <h2 class="h2">OpenAI</h2>
      <div class="flex flex-col items-end gap-4 mt-4">
        <div>
          <select
            class="select select-bordered w-full max-w-xs"
            oninput={onModelChange}
            value={settings().openai.model}
            aria-placeholder="select model"
          >
            <option disabled>Select Model</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            <option value="gpt-3.5-turbo-instruct">gpt-3.5-turbo-instruct</option>
            <option value="gpt-4">gpt-4</option>
          </select>
        </div>
        <textarea
          placeholder="input your openai apikey"
          class="textarea textarea-bordered textarea-lg w-full h-28 md:h-24 max-w-xs text-sm leading-5"
          value={settings().openai.apiKey}
          oninput={onApiKeyChange}
        />
        <textarea
          placeholder="custom your prompt"
          class="textarea textarea-bordered textarea-lg w-full h-28 md:h-24 max-w-xs text-sm leading-5"
          value={settings().openai.prompt}
          oninput={onPromptChange}
        />
      </div>
    </section>
  )
}
