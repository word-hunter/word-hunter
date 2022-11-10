import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import merge from 'webpack-merge'

import prodConfig from './webpack.config.base'

const config = merge(prodConfig, {
  plugins: [new BundleAnalyzerPlugin({ analyzerMode: 'static' })]
})

export default config
