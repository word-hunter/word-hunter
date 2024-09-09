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

const MAX_CONTEXT_WORDS_LENGTH = 100
function getTextAroundPoint(x: number, y: number) {
  const yStart = y - 30
  const yEnd = y + 30
  let rangeStart
  let rangeEnd
  let textNodeStart
  let textNodeEnd

  // @ts-ignore
  if (document.caretPositionFromPoint) {
    // @ts-ignore
    rangeStart = document.caretPositionFromPoint(x, yStart)
    textNodeStart = rangeStart.offsetNode
    // @ts-ignore
    rangeEnd = document.caretPositionFromPoint(x, yEnd)
    textNodeEnd = rangeEnd.offsetNode
  } else if (document.caretRangeFromPoint) {
    rangeStart = document.caretRangeFromPoint(x, yStart)
    rangeEnd = document.caretRangeFromPoint(x, yEnd)
    textNodeStart = rangeStart!.startContainer
    textNodeEnd = rangeEnd!.startContainer
  }

  const textRange = document.createRange()
  textRange.setStart(textNodeStart, 0)
  textRange.setEnd(textNodeEnd, textNodeEnd.textContent.length - 1)

  return textRange.toString().trim()
}

const wordContextCache = new WeakMap<Range, string>()
export function getWordContext(range: Range) {
  if (wordContextCache.has(range)) {
    return wordContextCache.get(range) ?? ''
  }

  const word = range.toString().trim()
  const rect = range.getBoundingClientRect()
  let text = getTextAroundPoint(rect.x, rect.y)

  if (text.split(' ').length > MAX_CONTEXT_WORDS_LENGTH) {
    // split sentence
    const sentences = text.split(/[.?;]/g)
    let wordIndexStart = text.indexOf(word)
    let wordIndexEnd = wordIndexStart + word.length

    // has multiple sentences
    if (sentences.length > 1) {
      let sentenceStart = 0
      sentences.some(s => {
        const sentenceEnd = sentenceStart + s.length

        if (wordIndexStart >= sentenceStart) {
          wordIndexStart = sentenceStart

          if (wordIndexEnd <= sentenceEnd) {
            text = text.substring(sentenceStart, sentenceEnd + 1).trim()
            return true
          } else {
            wordIndexStart = sentenceEnd + 1
          }
        }
        sentenceStart = sentenceEnd + 1
      })
    }
  }

  wordContextCache.set(range, text)
  return text
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

export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout

  return function (...args: Parameters<T>) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'short',
  hour12: false
})

export function formatTime(time: number) {
  return timeFormatter.format(time)
}

/**
 * create by chatGPT4
 */
export function getRelativeTimeString(date1: number, date2: number, locale = 'en-US') {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  const startDate = new Date(date1)
  const endDate = new Date(date2)
  const diffInMs = endDate.getTime() - startDate.getTime()

  const seconds = Math.floor(diffInMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  let months
  let years

  // Calculate difference in years.
  years = endDate.getFullYear() - startDate.getFullYear()
  const deltaMonths = endDate.getMonth() - startDate.getMonth()
  if (deltaMonths < 0 || (deltaMonths === 0 && endDate.getDate() < startDate.getDate())) {
    years--
  }

  // Calculate difference in months.
  if (years > 0) {
    startDate.setFullYear(startDate.getFullYear() + years)
  }
  months = endDate.getMonth() - startDate.getMonth()
  if (endDate.getDate() < startDate.getDate()) {
    months--
  }
  if (months < 0) {
    months += 12
  }

  if (years !== 0) {
    return formatTime(date1).split(' ')[0]
  } else if (months !== 0) {
    return formatTime(date1).split(' ')[0]
  } else if (days !== 0) {
    return rtf.format(-days, 'day')
  } else if (hours !== 0) {
    return rtf.format(-hours, 'hour')
  } else if (minutes !== 0) {
    return rtf.format(-minutes, 'minute')
  } else {
    return rtf.format(-seconds, 'second')
  }
}

export function isMatchURLPattern(list: string[], checkURL?: string) {
  checkURL = checkURL?.trim()

  if (!checkURL) {
    return [false, ''] as const
  }

  let matchedItem = ''

  const isMatch = list.some(item => {
    // @ts-ignore
    const _isMatch = new URLPattern({
      hostname: `{*.}?${item.replace(/:.*$/, '')}`
    }).test({
      hostname: checkURL.replace(/:.*$/, '')
    })

    if (_isMatch) {
      matchedItem = item
    }

    return _isMatch
  })

  return [isMatch, matchedItem] as const
}
