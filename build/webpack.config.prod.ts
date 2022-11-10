import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import merge from 'webpack-merge'

import baseConfig from './webpack.config.base'

const config = merge(baseConfig, {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin({})]
  }
})

export default config
