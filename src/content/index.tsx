import '@webcomponents/custom-elements'
import { render } from 'solid-js/web'
import { ZenMode } from './card'
import { invertHexColor, settings } from '../lib'

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'wh-card': any
    }
  }
}

const App = () => {
  return (
    <>
      <wh-card />
      <ZenMode />
      <style>
        {`
          :root {
            --wh-mark-color-0: ${invertHexColor(settings()['colors'][0])};
            --wh-mark-color-1: ${invertHexColor(settings()['colors'][1])};
            --wh-mark-bg-color: ${settings()['colors'][0]};
            --wh-mark-with-content-bg-color: ${settings()['colors'][1]};
          }
        `}
      </style>
    </>
  )
}

const root = document.createElement('wh-root')
document.body.appendChild(root)
render(() => <App />, root)
