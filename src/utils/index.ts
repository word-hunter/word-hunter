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
