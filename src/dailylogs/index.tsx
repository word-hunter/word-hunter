/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import { App } from './app'

render(() => <App />, document.getElementById('app') ?? document.body)
