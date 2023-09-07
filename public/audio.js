// this method is for chrome version 109 or lower, which don't support chrome.offscreen
// https://developer.chrome.com/docs/extensions/reference/offscreen/
onload = async () => {
  const src = new URL(location.href).searchParams.get('audio')
  if (!src) return

  const audio = new Audio(src)
  audio
    .play()
    .then(_ => console.log('Playing...'))
    .catch(error => console.log(error))

  audio.addEventListener('ended', function () {
    window.close()
  })
}

// this message listener is for chrome version 110 or higher, which support chrome.offscreen
// no need to close window here, we can use it for the next audio
// chrome will auto close the window after 30s
chrome.runtime.onMessage.addListener(message => {
  if (message.target !== 'offscreen') return
  if (message.type === 'play-audio') {
    const audio = new Audio(message.data)
    audio.play().catch(error => console.log(error))
  }
})
