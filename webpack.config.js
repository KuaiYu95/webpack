/**
* webpack.config.js
**/
const { resolve } = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin') // css 兼容性处理
const OptimizeCssAssetsWebpackPlugin = require('optimize-css-assets-webpack-plugin')  // css 代码压缩
const AddAssetHtmlWebpackPlugin = require('add-asset-html-webpack-plugin')  // css 代码压缩

// process.env.NODE_ENV = 'development'

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
    filename: 'build.[chunkhash:10].js',
    path: resolve(__dirname, 'build')
  },
  // js 代码压缩
  mode: 'production',
  module: {
    rules: [
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
        // 以下 loader 只会匹配一个
        // 注意：不能有两个配置处理同一种类型文件
        oneOf: [
          {
            test: /\.css$/,
            use: [...commonCssLoader]
          },
          {
            test: /\.less$/,
            use: [...commonCssLoader, 'less-loader']
          },
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: [
              // 开启多进程打包
              // 进程启动大概600ms，进程通信也有开销
              // 只有工作消耗时间比较长，才需要
              // 'thread-loader',
              {
                loader: 'thread-loader',
                options: {
                  workers: 2 // 进程2个
                }
              },
              {
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
                  ],
                  // 开启babel缓存
                  // 第二次构建，会读取之前的缓存
                  cacheDirectory: true
                }
              }
            ]
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
              publicPath: './images',
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
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/index.[chunkhash:10].css',
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      // html 代码压缩
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      }
    }),
    // 告诉webpack哪些库不参与打包，同时使用时的名称也得变
    new webpack.DllReferencePlugin({
      manifest: resolve(__dirname, 'dll/manifest.json')
    }),
    // 将某个文件打包输出去，并在 html 中自动引入该资源
    new AddAssetHtmlWebpackPlugin({
      filepath: resolve(__dirname, 'dll/jquery.js'),
      publicPath: './'
    }),
    new OptimizeCssAssetsWebpackPlugin()
  ],
  // 可以将 node_modules 中代码单独打包成一个chunk最终输出
  // 自动分析多入口 chunk 中，有无公共的文件，如果有，打包成一个单独的chunk
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  // 特点：只会在内存中打包，不会有任何输出
  devServer: {
    contentBase: resolve(__dirname, 'build'),
    // 监视 contentBase 目录下所有文件，一旦变化就会 reload
    watchContentBase: true,
    watchOptions: {
      // 忽略文件
      ignored: /node_modules/,
    },
    // 启动 gzip 压缩
    compress: true,
    port: 5000,
    // 自动打开默认浏览器
    open: true,
    // 开启 HMR 功能
    hot: true,
    // 不显示启动服务器日志信息
    clientLogLevel: 'none',
    // 除一些基本启动信息以外，其他内容都不用显示
    quiet: true,
    // 出现错误不要全屏提示
    overlay: false,
    // 服务器代理：开发环境跨域问题
    proxy: {
      // 一旦devServer(5000)服务器接收到一个/api/xxx请求，就会把请求转发到另一个服务器
      '/api': {
        target: 'http://localhost:3000',
        // 请求路径改写：/api/xxx ---> /xxx
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  },
  devtool: 'source-map',
  // 解析模块规则
  resolve: {
    // 配置解析模块路径别名
    alias: {
      "@util": resolve(__dirname, 'src/util')
    },
    // 配置省略文件路径的后缀名
    extensions: ['.js', '.less', '.json'],
    // 告诉webpack 解析模块应该去哪个目录
    modules: [resolve(__dirname, '../../node_modules'), 'node_modules']
  }
}