import 'express-async-errors'
import express, { Express, Request, Response, NextFunction } from 'express'
import * as path from 'path'
import fileUpload from 'express-fileupload'
import 'dotenv/config'

// 注册 tsconfig paths 别名，使 Node.js 运行时能解析 @shared 等路径别名
// 生产环境: __dirname = dist/，编译后的文件在 dist/src/shared/ 下
// 开发环境: ts-node 内置支持 tsconfig paths，此处注册不影响
import { register } from 'tsconfig-paths'
register({
  baseUrl: __dirname,
  paths: {
    '@shared/*': ['src/shared/*']
  }
})

import scheduler from './src/server/services/scheduler'
import routes from './src/server/routes'

const app: Express = express()
const PORT = parseInt(String(process.env.PORT || 2999), 10)

// Path resolution
// Compiled (production):  dist/server.js  -> __dirname = dist/
// ts-node   (development): server.ts      -> __dirname = project root
const projectRoot = path.resolve(__dirname, __dirname.endsWith(path.join('dist')) ? '..' : '.')
const isProduction = process.env.NODE_ENV === 'production'
const publicDir = process.env.PUBLIC_DIR || (
  isProduction
    ? path.resolve(projectRoot, 'dist')
    : path.resolve(projectRoot, 'src/client/public')
)

// 中间件
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  abortOnLimit: true,
  preserveExtension: true,
  safeFileNames: false,
  uriDecodeFileNames: true
}))

// API 路由
app.use('/api', routes)

// 静态文件服务
if (isProduction) {
  app.use(express.static(publicDir))

  app.get('*', (_req: Request, res: Response) => {
    if (_req.path.startsWith('/api')) {
      return res.status(404).json({
        error: {
          code: 404,
          message: 'API endpoint not found'
        }
      })
    }
    res.sendFile(path.join(publicDir, 'index.html'))
  })
} else {
  app.get('/', (_req: Request, res: Response) => {
    res.redirect('http://localhost:3000')
  })

  app.use(express.static(publicDir))
}

// 404 处理
app.use((req: Request, res: Response) => {
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
app.use((err: Error & { statusCode?: number }, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err)
  if (req.path.startsWith('/api')) {
    res.status(err.statusCode || 500).json({
      error: {
        code: err.statusCode || 500,
        message: err.message || 'Internal server error'
      }
    })
  } else {
    res.status(err.statusCode || 500).send('Internal server error')
  }
})

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  try {
    scheduler.start()
    console.log(`aria-max server is running on port ${PORT}`)
  } catch (err) {
    console.error('Error starting scheduler:', err)
    gracefulShutdown()
  }
})

// 优雅关闭处理
function gracefulShutdown(reason?: unknown, promise?: unknown): void {
  if (reason) {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  }
  scheduler.stop()
  server.close(() => {
    console.log('Server closed successfully')
    process.exit(0)
  })
}

// 监听进程信号
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// 处理未捕获的异常
process.on('uncaughtException', (err: Error, origin: string) => {
  console.error('Uncaught Exception:', err, 'Origin:', origin)
  gracefulShutdown()
})
process.on('unhandledRejection', gracefulShutdown)

export default app
