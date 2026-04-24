const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // Точка входа — главный файл
  entry: './src/index.js',
  
  // Куда собирать результат
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true  // очищает dist перед каждой сборкой
  },
  
  // Режим: development (для разработки) или production (для публикации)
  mode: 'development',
  
  // Как обрабатывать разные типы файлов
  module: {
    rules: [
      {
        // Для CSS файлов
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        // Для изображений (если будут)
        test: /\.(png|svg|jpg|gif)$/i,
        type: 'asset/resource'
      }
    ]
  },
  
  // Плагины
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',   // исходный HTML
      filename: 'index.html'          // что получится в dist
    })
  ],
  
  // Сервер для разработки (горячая перезагрузка)
  devServer: {
    static: './dist',
    hot: true,
    port: 3000
  },
  
  // Для отладки (чтобы видеть исходный код в браузере)
  devtool: 'source-map'
};