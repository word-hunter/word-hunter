import { apiKey, setApiKey } from '../utils/openai'

export const OpenAISetting = () => {
  const onApiKeyChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    setApiKey(target.value)
  }

  return (
    <section>
      <h2>OpenAI-APIKey:</h2>
      <div>
        <div>
          <textarea style={{ width: '350px', height: '60px' }} value={apiKey()} oninput={onApiKeyChange} />
        </div>
      </div>
    </section>
  )
}
