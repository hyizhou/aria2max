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
  console.log(`🚀 aria-max server is running on port ${PORT}`)
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`)
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Frontend available at http://localhost:${PORT}`)
  } else {
    console.log(`🌐 Vite dev server: http://localhost:3000`)
    console.log(`⚙️  Backend API: http://localhost:2999/api`)
    console.log(`📋 在开发模式下，请直接访问 http://localhost:3000`)
  }
  
  // 启动调度器服务
  scheduler.start()
  console.log('[Scheduler] Scheduler service started')
})

// 优雅关闭处理
function gracefulShutdown() {
  console.log('[Server] Starting graceful shutdown...')
  
  // 停止调度器
  scheduler.stop()
  console.log('[Scheduler] Scheduler service stopped')
  
  // 关闭HTTP服务器
  server.close(() => {
    console.log('[Server] HTTP server closed')
    process.exit(0)
  })
  
  // 如果服务器没有在10秒内关闭，强制退出
  setTimeout(() => {
    console.error('[Server] Forcing shutdown after timeout')
    process.exit(1)
  }, 10000)
}

// 监听进程信号
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught Exception:', error)
  gracefulShutdown()
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown()
})

module.exports = app