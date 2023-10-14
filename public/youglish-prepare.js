// remove cookie to skip daily exceed limit
function removeCookie() {
  chrome.cookies.remove({
    name: 'bakashot',
    url: 'https://youglish.com'
  })
}

// 3. This function creates a widget after the API code downloads.
let widget
function onYouglishAPIReady() {
  widget = new YG.Widget('widget-1', {
    components: 57567, //search box & caption
    events: {
      onVideoChange: onVideoChange
    }
  })
  // 4. process the query
  const word = new URL(location.href).searchParams.get('word')
  widget.fetch(word, 'english')
  document.title = 'YouGlish: ' + word
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
  removeCookie()
})

// 6. The API will call this method when switching to a new video.
function onVideoChange(event) {
  diceButton.classList.remove('rolling')
  diceButton.style.transform = `rotate(${Math.random() * 360}deg)`
}
