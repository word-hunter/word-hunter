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
    <section>
      <h2>OpenAI:</h2>
      <div>
        <h3>model</h3>
        <select oninput={onModelChange} value={settings().openai.model}>
          <option value="text-davinci-003">text-davinci-003</option>
          <option value="gpt4">gpt4</option>
        </select>
        <h3>apikey</h3>
        <div>
          <textarea
            style={{ width: '350px', height: '60px' }}
            value={settings()['openai'].apiKey}
            oninput={onApiKeyChange}
          />
        </div>
      </div>
    </section>
  )
}
