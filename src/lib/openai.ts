import { safeEmphasizeWordInText } from './index'
import { settings } from './settings'

function getHeaders() {
  const apiKey = settings()['openai'].apiKey
  return new Headers({ Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' })
}

export async function explainWord(word: string, context: string, model: string) {
  const headers = await getHeaders()
  const prompt = `Can you explain the word ${word} in the sentence "${context}" with grade 2 English words ?`

  // replace old model with new ones
  if (model === 'text-davinci-003') {
    model = 'gpt-3.5-turbo-instruct'
  }

  const isLegacyApi = model === 'gpt-3.5-turbo-instruct'
  let res: Awaited<ReturnType<typeof fetch>>
  try {
    if (!isLegacyApi) {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      })
    } else {
      res = await fetch('https://api.openai.com/v1/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          prompt: prompt,
          temperature: 0.8,
          max_tokens: 200,
          top_p: 1.0,
          frequency_penalty: 0.5,
          presence_penalty: 0.0
        })
      })
    }

    const json = await res.json()
    if (res.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your API key in the extension settings.')
    } else if (res.status !== 200) {
      throw json.error
    }
    const text = (!isLegacyApi ? json.choices[0].message.content : json.choices?.[0]?.text) ?? ''
    return safeEmphasizeWordInText(text.replace('\n\n', '\n').replaceAll('. ', '. \n\n'), word)
  } catch (e: any) {
    return e.message
  }
}
