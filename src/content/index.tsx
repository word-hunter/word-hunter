import '@webcomponents/custom-elements'
import { render } from 'solid-js/web'
import { ZenMode } from './card'
import { genMarkStyle, settings } from '../lib'

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
          ${genMarkStyle()}
        `}
        {`
          ${!settings().showCnTrans ? 'w-mark-t { display:none }' : ''}
        `}
      </style>
    </>
  )
}

const root = document.createElement('wh-root')
document.body.appendChild(root)
render(() => <App />, root)
