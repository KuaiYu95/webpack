/**
* webpack.config.js
**/
const { resolve } = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin') // css 兼容性处理
const OptimizeCssAssetsWebpackPlugin = require('optimize-css-assets-webpack-plugin')  // css 代码压缩

process.env.NODE_ENV = 'development'

const commonCssLoader = [
  MiniCssExtractPlugin.loader,
  'css-loader',
  // 需要在 package.json 中定义 browserslist
  {
    loader: 'postcss-loader',
    ident: 'postcss',
    options: {
      postcssOptions: {
        plugins: [
          ['postcss-preset-env', {}]
        ]
      }
    }
  }
]

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'build.js',
    path: resolve(__dirname, 'build')
  },
  // js 代码压缩
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [...commonCssLoader]
      },
      {
        test: /\.less$/,
        use: [...commonCssLoader, 'less-loader']
      },
      {
        // package.json 中 eslintConfig 中的设置
        test: /\.js$/,
        exclude: /node_modules/,
        // 优先执行 eslint ，然后执行 babel
        enforce: 'pre',
        loader: 'eslint-loader',
        options: {
          // 自动修复 eslint 错误
          fix: true,
        }
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: [
            [
              '@babel/preset-env',
              {
                useBuiltIns: 'usage',
                corejs: { version: 3 },
                targets: {
                  chrome: '60',
                  firefox: '60',
                  ie: '9',
                  safari: '10',
                  edge: '17'
                }
              }
            ]
          ]
        }
      },
      {
        // 问题：默认处理不了 html 中 img 图片（使用 html-loader 解决）
        test: /\.(jpg|png|gif)$/,
        // 只有一个 loader 可以直接 loader，不需要使用 use
        // 下载 url-loader file-loader 两个包
        loader: 'url-loader',
        options: {
          // 图片大小小于8kb就会被base64处理
          // 优点：减少请求数量
          // 缺点：图片体积会更大（文件请求速度更慢）
          limit: 8 * 1024,
          // 问题：url-loader 默认使用 ES6 模块化解析
          // 			html-loader 默认使用 commonjs 解析，解析会报错
          // 解决：关闭 ES6 模块化处理
          esModule: false,
          // 给图片重命名，取hash前10位，取图片原扩展名
          name: '[hash:10].[ext]',
          // 输出路径
          publicPath: '../',
          outputPath: 'images'
        }
      },
      {
        // 专门处理 html 中 img 文件图片
        // 负责引入 img 图片，能被 url-loader 处理
        test: /\.html$/,
        loader: 'html-loader'
      },
      {
        // 打包其他资源
        exclude: /\.(html|js|css|less|jpg|png|gif)$/,
        loader: 'file-loader',
        options: {
          name: '[hash:10].[ext]',
          publicPath: './',
          outputPath: 'otherFile'
        }
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/index.css',
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      // html 代码压缩
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      }
    }),
    new OptimizeCssAssetsWebpackPlugin()
  ],
  // 特点：只会在内存中打包，不会有任何输出
  devServer: {
    contentBase: resolve(__dirname, 'build'),
    // 启动 gzip 压缩
    compress: true,
    port: 3000,
    // 自动打开默认浏览器
    open: true
  }
}