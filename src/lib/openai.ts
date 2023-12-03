import { safeEmphasizeWordInText } from './index'
import { DEFAULT_SETTINGS, settings } from './settings'

function getHeaders() {
  const apiKey = settings().openai.apiKey
  return new Headers({ Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' })
}

export async function explainWord(word: string, context: string, model: string) {
  const headers = await getHeaders()
  const promptTemplate = settings().openai.prompt ?? DEFAULT_SETTINGS.openai.prompt
  const prompt = promptTemplate.replace('${word}', word).replace('${context}', context)

  // replace old model with new ones
  // https://platform.openai.com/docs/guides/text-generation
  if (model === 'text-davinci-003' || model === 'gpt-3.5-turbo-instruct') {
    model = 'gpt-3.5-turbo'
  }

  try {
    const url = settings().openai.apiProxy || DEFAULT_SETTINGS.openai.apiProxy
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || DEFAULT_SETTINGS.openai.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    const json = await res.json()
    if (res.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your API key in the extension settings.')
    } else if (res.status !== 200) {
      throw json.error
    }
    const text = json.choices[0].message.content ?? ''
    return safeEmphasizeWordInText(text.replace('\n\n', '\n').replaceAll('. ', '. \n\n'), word)
  } catch (e: any) {
    return e.message
  }
}
