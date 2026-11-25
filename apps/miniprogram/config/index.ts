import { defineConfig } from '@tarojs/cli'

export default defineConfig({
  projectName: 'home-pantry',
  date: '2026-11-25',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
    375: 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'webpack5',
  defineConstants: {
    'process.env.TARO_APP_API_BASE_URL': JSON.stringify(process.env.TARO_APP_API_BASE_URL || 'http://127.0.0.1:3000/api'),
    // 纯本地演示版本：不请求后端，隐藏家庭协同入口
    'process.env.TARO_APP_LOCAL_ONLY': JSON.stringify(process.env.TARO_APP_LOCAL_ONLY || 'false'),
  },
  cache: { enable: true },
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      url: { enable: true, config: { limit: 1024 } },
      cssModules: { enable: false, config: { namingPattern: 'module', generateScopedName: '[name]__[local]___[hash:base64:5]' } },
    },
  },
  h5: { publicPath: '/', staticDirectory: 'static' },
})
