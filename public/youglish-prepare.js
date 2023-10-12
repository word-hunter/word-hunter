const word = new URL(location.href).searchParams.get('word')
document.querySelector('a').dataset.query = word
document.title = 'YouGlish: ' + word

// remove cookie to skip daily exceed limit
function removeCookie() {
  chrome.cookies.remove({
    name: 'bakashot',
    url: 'https://youglish.com'
  })
}

let widget = null
function onYouglishAPIReady() {
  widget = window.YG.getWidget('yg-widget-0')
}

const diceButton = document.querySelector('#dice')
diceButton.addEventListener('click', async () => {
  const { context } = await chrome.storage.local.get('context')
  const keys = Object.keys(context)
  const rand = Math.floor(Math.random() * keys.length)
  const word = keys[rand]
  diceButton.classList.add('rolling')
  widget.search(word)
  document.title = 'YouGlish: ' + word
  setTimeout(() => {
    diceButton.classList.remove('rolling')
    diceButton.style.transform = `rotate(${Math.random() * 360}deg)`
  }, 300)
  removeCookie()
})
