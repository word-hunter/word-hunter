onload = async () => {
  const src = new URL(location.href).searchParams.get('audio')
  const audio = new Audio(src)

  audio
    .play()
    .then(_ => console.log('Playing...'))
    .catch(error => console.log(error))

  audio.addEventListener('ended', function () {
    window.close()
  })
}
