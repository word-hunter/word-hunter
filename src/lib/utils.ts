export const safeEmphasizeWordInText = (text: string = '', word: string, tag: string = 'b') => {
  const regex = new RegExp('(<.*>)?(' + word + ')(</.*>)?', 'gi')
  return text.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(regex, `$1<${tag}>$2</${tag}>$3`)
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

export const getWordContext = (node: Node, originWord?: string): string => {
  if (!node) return originWord ?? ''
  let text = originWord ?? node.textContent ?? ''
  let left = node.previousSibling
  let right = node.nextSibling

  let hasDot = false
  while (left) {
    const leftText =
      left.nodeName.toLowerCase() !== 'w-mark-t' &&
      (left.nodeType === Node.ELEMENT_NODE || left.nodeType === Node.TEXT_NODE)
        ? left.textContent ?? ''
        : ''
    if (leftText.includes('.')) {
      hasDot = true
      text = leftText.split('.').at(-1) + ' ' + text
      left = null
    } else {
      text = leftText + ' ' + text
      left = left.previousSibling
    }
  }

  while (right) {
    const rightText =
      right.nodeName.toLowerCase() !== 'w-mark-t' &&
      (right.nodeType === Node.ELEMENT_NODE || right.nodeType === Node.TEXT_NODE)
        ? right.textContent ?? ''
        : ''
    if (rightText.includes('.')) {
      hasDot = true
      text = text + ' ' + rightText.split('.')[0] + '.'
      right = null
    } else {
      text = text + ' ' + rightText
      right = findRightSibling(right)
    }
  }

  if (text.split(' ').length < 5 && !hasDot && getComputedStyle(node as HTMLElement).display.startsWith('inline')) {
    return getWordContext(node.parentElement!)
  }

  return text.slice(0, 300)
}

function findRightSibling(el: Node) {
  if (el.nextSibling) {
    return el.nextSibling
  } else {
    const p = el.parentElement
    if (
      p?.classList.contains('__mark_parent') ||
      // handle class for youtube video captions in one-line, let it expand to multiple lines
      p?.classList.contains('caption-visual-line') ||
      p?.classList.contains('ytp-caption-segment')
    ) {
      return findRightSibling(p)
    } else {
      return null
    }
  }
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
