import { FILE_NAME } from './drive'

const GITHUB_API_URL = 'https://api.github.com/gists'

export async function getGistData(token: string, gistId: string) {
  try {
    const response = await fetch(`${GITHUB_API_URL}/${gistId}`, {
      method: 'GET',
      headers: {
        Authorization: `token ${token}`
      }
    })
    const isExist = response.status === 200
    if (!isExist) {
      throw new Error('Gist not found')
    }
    const data = await response.json()
    const content = data.files?.[FILE_NAME]?.content || '{}'
    return JSON.parse(content)
  } catch (error) {
    throw error
  }
}

export async function updateGist(token: string, gistId: string, content: Record<string, any>) {
  try {
    const response = await fetch(`${GITHUB_API_URL}/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          [FILE_NAME]: {
            content: JSON.stringify(content)
          }
        }
      })
    })
    const data = await response.json()
    if (response.status === 200) {
      return data
    }
    throw new Error(data.message || 'Failed to sync with the gist')
  } catch (error) {
    throw error
  }
}
