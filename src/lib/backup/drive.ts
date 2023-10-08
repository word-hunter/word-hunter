let authToken = ''

const API_PATH = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_API_PATH = 'https://www.googleapis.com/upload/drive/v3/files'
export const FOLDER_NAME = 'Word Hunter Backup'
export const FILE_NAME = 'word_hunter_backup.json'

export const isMobile = navigator.userAgent.includes('Mobile') || navigator.userAgent.includes('Android')

export function isValidAuthToken(token: string) {
  return !!token && /ya29.[0-9A-Za-z-_]+/.test(token)
}

export async function auth(interactive: boolean) {
  if (isMobile) {
    const tokenForMobile = (await chrome.storage.local.get(['mobile_auth_token'])).mobile_auth_token
    if (isValidAuthToken(tokenForMobile)) {
      authToken = tokenForMobile
      return authToken
    }
  }
  const { token } = await chrome.identity.getAuthToken({ interactive: interactive })
  if (token) {
    authToken = token
  } else {
    throw new Error('Failed to get token.')
  }
}

export async function removeCachedAuthToken() {
  if (authToken) {
    await chrome.identity.removeCachedAuthToken({
      token: authToken
    })
    authToken = ''
  }
}

export async function createFolder(folderName: string) {
  const folder = await uploadFile(new File([JSON.stringify({})], folderName), 'application/vnd.google-apps.folder')
  return (folder as any).id
}

// https://developers.google.com/drive/api/guides/manage-uploads?#multipart
export async function uploadFile(file: File, mimeType: string, folderId?: string, fileId?: string) {
  const strategyFileMetadata = JSON.stringify({
    name: file.name,
    mimeType: mimeType,
    parents: fileId ? undefined : folderId ? [folderId] : undefined,
    appProperties: {
      wh: '1'
    }
  })

  const formData = new FormData()
  formData.append('metadata', new Blob([strategyFileMetadata], { type: 'application/json' }))
  formData.append('file', file)
  const method = fileId ? 'PATCH' : 'POST'
  const url = fileId ? `${UPLOAD_API_PATH}/${fileId}?uploadType=multipart` : `${UPLOAD_API_PATH}?uploadType=multipart`
  const uploadedFile = await makeRequest(method, url, 'json', formData)
  return uploadedFile
}

export async function downloadFile(fileId: string) {
  const file = await makeRequest('GET', `${API_PATH}/${fileId}?alt=media`, 'json')
  return file
}

export async function mergeAndSync() {}

async function makeRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  url: string,
  responseType: 'json' | 'blob',
  data?: FormData
) {
  const headers = {
    Authorization: `Bearer ${authToken}`
  }

  const options: RequestInit = {
    method,
    headers
  }

  if (data) {
    options.body = data
  }

  const response = await fetch(url, options)

  if (!response.ok) {
    if (response.status === 401) {
      await removeCachedAuthToken()
      throw new Error('Unauthorized, Please authorize again.')
    } else {
      throw new Error(`Request failed with status: ${response.status}`)
    }
  }

  if (responseType === 'json') {
    return response.json()
  } else if (responseType === 'blob') {
    return response.blob()
  } else {
    throw new Error('Invalid responseType')
  }
}

export async function findFileId(dirId: string) {
  const fileQuery = `name = '${FILE_NAME}' and trashed = false and appProperties has { key='wh' and value='1' } and '${dirId}' in parents`
  const flist = await queryFile(fileQuery)
  return flist.files[0]?.id
}

export async function findDirId() {
  const dirQuery = `name = '${FOLDER_NAME}' and trashed = false and appProperties has { key='wh' and value='1' }`
  const flist = await queryFile(dirQuery)
  return flist.files[0]?.id
}

type FileList = {
  files: {
    id: string
    mimeType: string
    name: string
  }[]
}

async function queryFile(query: string): Promise<FileList> {
  const queryUrl = `${API_PATH}?q=${encodeURIComponent(query)}`
  const res = await makeRequest('GET', queryUrl, 'json')
  return res as FileList
}
