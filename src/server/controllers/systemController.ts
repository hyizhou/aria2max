// 系统管理控制器
import { Request, Response, NextFunction } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import aria2Client, { defaultConfig, getFinalConfig, invalidateConfigCache } from '../config/aria2'
import { getConfigPath } from '../config/paths'
import { getSystemInfo, getDeviceNetworkSpeed } from '../services/systemInfoService'
import type { SystemConfig, TestConnectionResponse } from '../../shared/types'

interface SystemController {
  getSystemStatus(req: Request, res: Response): Promise<void>
  getConfig(req: Request, res: Response): Promise<void>
  saveConfig(req: Request, res: Response): Promise<void>
  testConnection(req: Request, res: Response, next: NextFunction): Promise<void>
  getSystemInfo(req: Request, res: Response): Promise<void>
  getRealtimeSpeed(req: Request, res: Response): Promise<void>
  getDeviceNetworkSpeed(req: Request, res: Response): Promise<void>
  getAria2Options(req: Request, res: Response): Promise<void>
  setAria2Options(req: Request, res: Response): Promise<void>
}

class SystemControllerImpl implements SystemController {
  // 获取 aria2 系统状态
  async getSystemStatus(_req: Request, res: Response): Promise<void> {
    const status = await aria2Client.getSystemStatus()
    res.json(status)
  }

  // 获取配置信息
  async getConfig(_req: Request, res: Response): Promise<void> {
    const config = getFinalConfig()
    // 返回配置，隐藏 RPC 密钥
    res.json({
      ...config,
      aria2RpcSecret: ''
    })
  }

  // 保存配置信息
  async saveConfig(req: Request, res: Response): Promise<void> {
    try {
      console.log('Saving config with data:', req.body)

      const configPath = getConfigPath()
      let existingConfig: SystemConfig = { ...defaultConfig } as SystemConfig

      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8')
        existingConfig = JSON.parse(configData)
      }

      const configFile: SystemConfig = { ...existingConfig }
      // 需要特殊处理的字段：空字符串时不覆盖
      const nonEmptyFields = new Set(['aria2RpcSecret', 'authPassword'])

      for (const key of Object.keys(defaultConfig) as (keyof SystemConfig)[]) {
        if (req.body[key] !== undefined) {
          if (nonEmptyFields.has(key) && req.body[key] === '') continue
          ;(configFile as unknown as Record<string, unknown>)[key] = req.body[key]
        }
      }

      console.log('Final config to save:', configFile)

      const configDir = path.dirname(configPath)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }

      fs.writeFileSync(configPath, JSON.stringify(configFile, null, 2))

      // 配置文件已写入，清除缓存使下次请求读取新配置
      invalidateConfigCache()

      res.json({ success: true })
    } catch (error) {
      const err = error as Error
      console.error('Save config error:', error)
      res.status(500).json({
        success: false,
        error: {
          message: err.message || 'Failed to save config'
        }
      })
    }
  }

  // 测试连接
  async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    const result = await aria2Client.testConnection(req.body)

    if (result.success) {
      const response: TestConnectionResponse = {
        success: true,
        message: result.message,
        details: result.details
      }
      res.json(response)
    } else {
      const err = new Error(result.message) as Error & { statusCode?: number; details?: typeof result.details }
      err.statusCode = 400
      err.details = result.details
      next(err)
    }
  }

  // 获取系统状态信息
  async getSystemInfo(_req: Request, res: Response): Promise<void> {
    const systemInfo = await getSystemInfo()
    res.json(systemInfo)
  }

  // 获取实时网速（Dashboard专用）
  async getRealtimeSpeed(_req: Request, res: Response): Promise<void> {
    const tasks = await aria2Client.getTasks()
    const activeTasks = tasks.filter(task => task.status === 'active')

    let totalDownloadSpeed = 0
    let totalUploadSpeed = 0

    activeTasks.forEach(task => {
      totalDownloadSpeed += parseInt(task.downloadSpeed || '0', 10)
      totalUploadSpeed += parseInt(task.uploadSpeed || '0', 10)
    })

    res.json({
      downloadSpeed: totalDownloadSpeed,
      uploadSpeed: totalUploadSpeed,
      activeConnections: activeTasks.length,
      timestamp: new Date().toISOString()
    })
  }

  // 获取设备网速
  async getDeviceNetworkSpeed(_req: Request, res: Response): Promise<void> {
    const speed = await getDeviceNetworkSpeed()
    res.json(speed)
  }

  // 获取 Aria2 运行时全局选项
  async getAria2Options(_req: Request, res: Response): Promise<void> {
    try {
      const options = await aria2Client.getGlobalOptions()
      res.json(options)
    } catch (error) {
      const err = error as Error
      res.status(500).json({ success: false, error: { message: err.message } })
    }
  }

  // 临时修改 Aria2 运行时全局选项（不持久化）
  async setAria2Options(req: Request, res: Response): Promise<void> {
    try {
      await aria2Client.changeGlobalOption(req.body)
      res.json({ success: true })
    } catch (error) {
      const err = error as Error
      res.status(500).json({ success: false, error: { message: err.message } })
    }
  }
}

export default new SystemControllerImpl()
