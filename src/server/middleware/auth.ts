import { Request, Response, NextFunction, Router } from 'express'
import * as crypto from 'crypto'
import { getFinalConfig } from '../config/aria2'

// 内存中的 session 存储
const sessions = new Map<string, { createdAt: number }>()
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 天

function getPassword(): string {
  return getFinalConfig().authPassword || ''
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function isValidSession(token: string): boolean {
  const session = sessions.get(token)
  if (!session) return false
  if (Date.now() - session.createdAt > SESSION_MAX_AGE) {
    sessions.delete(token)
    return false
  }
  return true
}

// 认证中间件
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const password = getPassword()

  // 无密码，不启用认证
  if (!password) {
    next()
    return
  }

  // auth 路由本身不需要认证
  if (req.path.startsWith('/auth/')) {
    next()
    return
  }

  const token = req.cookies?.session_token
  if (token && isValidSession(token)) {
    next()
    return
  }

  res.status(401).json({ error: { code: 401, message: 'Authentication required' } })
}

// 认证路由
export function createAuthRouter(): Router {
  const router = Router()

  // 检查认证状态
  router.get('/auth/status', (_req: Request, res: Response) => {
    const password = getPassword()
    const token = _req.cookies?.session_token
    const isAuthenticated = token ? isValidSession(token) : false
    res.json({ requiresAuth: !!password, isAuthenticated })
  })

  // 登录
  router.post('/auth/login', (req: Request, res: Response) => {
    const password = getPassword()
    if (!password) {
      res.json({ success: true, message: 'No password configured' })
      return
    }

    const { password: inputPassword } = req.body
    if (!inputPassword || inputPassword !== password) {
      res.status(401).json({ error: { code: 401, message: 'Invalid password' } })
      return
    }

    const token = generateToken()
    sessions.set(token, { createdAt: Date.now() })
    res.cookie('session_token', token, {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      sameSite: 'strict'
    })
    res.json({ success: true })
  })

  // 登出
  router.post('/auth/logout', (req: Request, res: Response) => {
    const token = req.cookies?.session_token
    if (token) {
      sessions.delete(token)
    }
    res.clearCookie('session_token')
    res.json({ success: true })
  })

  return router
}

// 启动时检查认证状态
export function logAuthStatus(): void {
  const password = getPassword()
  if (!password) {
    console.warn('[Auth] WARNING: No password configured. API is open to all network access.')
    console.warn('[Auth] Run "aria2max passwd" to set a password.')
  } else {
    console.log('[Auth] Password authentication enabled.')
  }
}
