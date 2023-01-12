const word = new URL(location.href).searchParams.get('word')
document.querySelector('a').dataset.query = word
document.title = 'YouGlish: ' + word

// remove cookie to skip daily exceed limit
chrome.cookies.remove({
  name: 'bakashot',
  url: 'https://youglish.com'
})
