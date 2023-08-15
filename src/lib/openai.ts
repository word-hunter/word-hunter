import { safeEmphasizeWordInText } from './index'
import { settings } from './settings'

function getHeaders() {
  const apiKey = settings()['openai'].apiKey
  return new Headers({ Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' })
}

export async function explainWord(word: string, context: string) {
  const headers = await getHeaders()
  const prompt = `Can you explain the word ${word} in the sentence "${context}" with grade 2 English words ?`
  const model = settings()['openai'].model
  const isGPT4 = model === 'gpt4'
  let res: Awaited<ReturnType<typeof fetch>>
  try {
    if (isGPT4) {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          choices: [
            {
              index: 0,
              message: {
                role: 'user',
                content: prompt
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            max_tokens: 200
          }
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
    const text = (isGPT4 ? json.choices[0].message.content : json.choices?.[0]?.text) ?? ''
    return safeEmphasizeWordInText(text.replace('\n\n', '\n').replaceAll('. ', '. \n\n'), word)
  } catch (e: any) {
    return e.message
  }
}
