const express = require('express')
const cors = require('cors')
const path = require('path')
const fileUpload = require('express-fileupload')
require('dotenv').config()

// 导入服务
const scheduler = require('./services/scheduler')

// 创建 Express 应用
const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  abortOnLimit: true,
  preserveExtension: true,
  safeFileNames: false, // Allow UTF-8 characters in filenames
  uriDecodeFileNames: true
}))

// API 路由
app.use('/api', require('./routes'))

// 主页路由
app.get('/', (req, res) => {
  res.json({
    message: 'aria-max API Server',
    version: '1.0.0',
    docs: '/api/docs' // TODO: 添加 API 文档
  })
})

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 404,
      message: 'API endpoint not found'
    }
  })
})

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: {
      code: 500,
      message: 'Internal server error'
    }
  })
})

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`aria-max backend server is running on port ${PORT}`)
  console.log(`API endpoints available at http://0.0.0.0:${PORT}/api`)
  
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