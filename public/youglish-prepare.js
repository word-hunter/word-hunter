const word = new URL(location.href).searchParams.get('word')
document.querySelector('a').dataset.query = word
document.title = 'YouGlish: ' + word
