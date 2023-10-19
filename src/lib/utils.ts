export const safeEmphasizeWordInText = (text: string = '', word: string, tag: string = 'b') => {
  const regex = new RegExp('(<.*>)?(' + word + ')(</.*>)?', 'gi')
  return text.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(regex, `$1<${tag}>$2</${tag}>$3`)
}

export const getFaviconUrl = () => {
  const favicon = document.querySelector('link[rel*="icon"]') as HTMLLinkElement
  const iconUrl = favicon?.href ?? ''
  if (iconUrl.startsWith('data:image')) return ''
  return iconUrl
}

export const getFaviconByDomain = (url: string) => {
  let host = new URL(url).host || 'localhost'
  return `https://s2.googleusercontent.com/s2/favicons?domain=${host}`
}

export const getDocumentTitle = () => {
  return document.title.substring(0, 40)
}

export const getWordContext = (range: Range, originWord?: string): string => {
  let pNode = range.commonAncestorContainer?.parentElement as HTMLElement
  while (getComputedStyle(pNode).display.startsWith('inline')) {
    pNode = pNode.parentElement as HTMLElement
  }
  // remove all <w-mark-t> tags in context
  const pNodeClone = pNode.cloneNode(true) as HTMLElement
  pNodeClone.querySelectorAll('w-mark-t').forEach(t => t.remove())

  const text = pNodeClone?.textContent ?? originWord ?? ''
  const sliceStart = text.indexOf(range.commonAncestorContainer?.textContent ?? originWord ?? '') ?? 0
  let start = sliceStart + range.startOffset
  let end = sliceStart + range.endOffset
  while (start > 0 && text.at(start - 1) !== '.') start--
  while (end < text.length && text.at(end) !== '.') end++
  if (text.at(end) === '.') end++

  pNodeClone.remove()
  return text.slice(start, end)
}

export const downloadAsJsonFile = (content: string, filename: string) => {
  const a = document.createElement('a')
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
  a.download = filename
  a.click()
}

export const invertHexColor = (hex: string) => {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1)
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.')
  }
  const r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16)
  // https://stackoverflow.com/a/3943023/112731
  return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#FFFFFF'
}

export function executeScript<T>(func: () => T): Promise<{ result: T }[]> {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      const curId = tabs[0].id
      if (curId) {
        const result = await chrome.scripting.executeScript({ target: { tabId: curId }, func: func })
        resolve(result as any)
      }
    })
  })
}

export function uuidv4() {
  // @ts-ignore
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  )
}
