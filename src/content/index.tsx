import '@webcomponents/custom-elements'
import { render } from 'solid-js/web'
import { ZenMode } from './card'
import { invertHexColor } from '../utils'
import { colors } from '../utils/color'

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
            --wh-mark-color: ${invertHexColor(colors()[0])};
            --wh-mark-bg-color: ${colors()[0]};
            --wh-mark-with-content-bg-color: ${colors()[1]};
          }
        `}
      </style>
    </>
  )
}

const root = document.createElement('wh-root')
document.body.appendChild(root)
render(() => <App />, root)
