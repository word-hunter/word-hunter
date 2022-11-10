import { MiniReactRefreshWebpackPlugin } from '@njzy/mini-react-refresh-webpack-plugin'
import merge from 'webpack-merge'

import baseConfig from './webpack.config.base'

const config = merge(baseConfig, {
  mode: 'development',
  devServer: {
    compress: true,
    clientLogLevel: 'silent',
    publicPath: '/',
    historyApiFallback: true,
    progress: true,
    overlay: true
  },
  module: {},
  plugins: [new MiniReactRefreshWebpackPlugin({ entryNames: ['popup', 'options'], exclude: [/\/src\/contents\//] })]
})

export default config
