const express = require('express')
const cors = require('cors')
const path = require('path')
const fileUpload = require('express-fileupload')
require('dotenv').config()

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`aria-max backend server is running on port ${PORT}`)
  console.log(`API endpoints available at http://0.0.0.0:${PORT}/api`)
})

module.exports = app