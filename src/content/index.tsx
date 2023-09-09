import '@webcomponents/custom-elements'
import { render } from 'solid-js/web'
import { ZenMode } from './card'
import { genMarkStyle } from '../lib'

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
              ${genMarkStyle()}
          }
        `}
      </style>
    </>
  )
}

const root = document.createElement('wh-root')
document.body.appendChild(root)
render(() => <App />, root)
