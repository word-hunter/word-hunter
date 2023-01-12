export const safeEmphasizeWordInText = (text: string = '', word: string, tag: string = 'b') => {
  const regex = new RegExp('(<.*>)?' + word + '(</.*>)?', 'gi')
  return text.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(regex, `$1<${tag}>${word}</${tag}>$2`)
}

export const getFaviconUrl = () => {
  const favicon = document.querySelector('link[rel*="icon"]') as HTMLLinkElement
  return favicon?.href ?? ''
}

export const getFaviconByDomain = (url: string) => {
  const host = new URL(url).host
  return `https://s2.googleusercontent.com/s2/favicons?domain=${host}`
}

export const getDocumentTitle = () => {
  return document.title.substring(0, 40)
}

export const getWordContext = (node: HTMLElement): string => {
  const pNode = node.parentElement
  const context = pNode?.textContent ?? ''
  const word = node.textContent ?? ''

  const shouldContinue =
    pNode && (context.trim() === word.trim() || getComputedStyle(pNode).display.startsWith('inline'))

  if (shouldContinue) {
    return getWordContext(pNode)
  }

  if (context.length > 300) {
    const fragment = context.split(word)
    const preSentences = fragment[0].split('.')
    const postSentences = fragment[1].split('.')
    const preContent = preSentences.length > 1 ? preSentences[preSentences.length - 1] : preSentences[0]
    const postContent = postSentences.length > 1 ? postSentences[0] + '.' : postSentences[0]
    const result = preContent + word + postContent
    return result.length > 300 ? word : result
  }
  return context
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
