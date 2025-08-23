const express = require('express')
const path = require('path')
const fileUpload = require('express-fileupload')
require('dotenv').config()

// 导入服务
const scheduler = require('./src/server/services/scheduler')

// 创建 Express 应用
const app = express()
const PORT = process.env.PORT || 2999

// 中间件
// 移除CORS中间件，因为是单体应用
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  abortOnLimit: true,
  preserveExtension: true,
  safeFileNames: false,
  uriDecodeFileNames: true
}))

// API 路由
app.use('/api', require('./src/server/routes'))

// 静态文件服务
// 在生产环境中，服务构建后的前端文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')))
  
  // 处理前端路由的history模式
  app.get('*', (req, res) => {
    // 如果请求的是API路由，返回404
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        error: {
          code: 404,
          message: 'API endpoint not found'
        }
      })
    }
    // 否则返回前端应用
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
  })
} else {
  // 开发环境 - 直接重定向到Vite开发服务器
  app.get('/', (req, res) => {
    res.redirect('http://localhost:3000')
  })
  
  // 开发环境静态文件服务（可选）
  app.use(express.static(path.join(__dirname, 'src/client/public')))
}

// 404 处理
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      error: {
        code: 404,
        message: 'API endpoint not found'
      }
    })
  } else {
    res.status(404).send('Page not found')
  }
})

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  if (req.path.startsWith('/api')) {
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error'
      }
    })
  } else {
    res.status(500).send('Internal server error')
  }
})

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  try {
    scheduler.start()
  } catch (err) {
    console.error('Error starting scheduler:', err);
    gracefulShutdown();
  }
})

// 优雅关闭处理
function gracefulShutdown(reason, promise) {
  if (reason) {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
  scheduler.stop()
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0); // exit with success code
  });
}

// 监听进程信号
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// 处理未捕获的异常
process.on('uncaughtException', (err, origin) => {
  console.error('Uncaught Exception:', err, 'Origin:', origin);
  gracefulShutdown();
});
process.on('unhandledRejection', gracefulShutdown)

module.exports = app