export const emphasizeWordInText = (text: string, word: string, tag: string = 'b') => {
  const regex = new RegExp(word, 'gi')
  return text.replace(regex, `<${tag}>${word}</${tag}>`)
}

export const getFaviconUrl = () => {
  const favicon = document.querySelector('link[rel*="icon"]') as HTMLLinkElement
  if (favicon) {
    return favicon.href ?? ''
  }
  return ''
}

export const downloadAsJsonFile = (content: string, filename: string) => {
  const a = document.createElement('a')
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
  a.download = filename
  a.click()
}
