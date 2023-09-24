let authToken = ''

const API_PATH = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_API_PATH = 'https://www.googleapis.com/upload/drive/v3/files'
export const FOLDER_NAME = 'Word Hunter Backup'
export const FILE_NAME = 'word_hunter_backup.json'

export async function auth(interactive: boolean) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: interactive }, (token: string | undefined) => {
      if (token) {
        resolve(token)
        authToken = token
      } else {
        reject(new Error('Failed to get token.'))
      }
    })
  })
}

export async function removeCachedAuthToken() {
  if (authToken) {
    chrome.identity.removeCachedAuthToken(
      {
        token: authToken
      },
      () => {
        authToken = ''
      }
    )
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

function makeRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  url: string,
  responseType: 'json' | 'blob',
  data?: FormData
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.responseType = responseType
    xhr.open(method, url)
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.response)
        return
      }
      if (xhr.status === 401) {
        removeCachedAuthToken()
        reject(new Error('Unauthorized, Please authorize again.'))
        return
      }
      reject(xhr.status)
    }
    xhr.send(data)
  })
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
