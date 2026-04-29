// 系统管理控制器
import { Request, Response, NextFunction } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import aria2Client from '../config/aria2'
import { getConfigPath } from '../config/paths'
import { getSystemInfo, getDeviceNetworkSpeed } from '../services/systemInfoService'
import type { SystemConfig, TestConnectionResponse } from '../../shared/types'

// 默认配置（与 aria2.ts 保持一致）
const defaultConfig: SystemConfig = {
  aria2RpcUrl: 'http://localhost:6800/jsonrpc',
  aria2RpcSecret: '',
  downloadDir: '/tmp',
  aria2ConfigPath: '',
  autoDeleteMetadata: false,
  autoDeleteAria2FilesOnRemove: false,
  autoDeleteAria2FilesOnSchedule: false
}

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
    const configPath = getConfigPath()
    let configFile: SystemConfig = { ...defaultConfig }

    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8')
      const fileConfig = JSON.parse(configData)

      configFile = {
        ...configFile,
        ...fileConfig
      }
    }

    process.env.ARIA2_RPC_URL = configFile.aria2RpcUrl
    process.env.ARIA2_RPC_SECRET = configFile.aria2RpcSecret
    process.env.DOWNLOAD_DIR = configFile.downloadDir
    process.env.AUTO_DELETE_METADATA = configFile.autoDeleteMetadata.toString()
    process.env.AUTO_DELETE_ARIA2_FILES_ON_REMOVE = configFile.autoDeleteAria2FilesOnRemove.toString()
    process.env.AUTO_DELETE_ARIA2_FILES_ON_SCHEDULE = configFile.autoDeleteAria2FilesOnSchedule.toString()

    res.json({
      aria2RpcUrl: configFile.aria2RpcUrl,
      aria2RpcSecret: '',
      downloadDir: configFile.downloadDir,
      aria2ConfigPath: configFile.aria2ConfigPath || '',
      autoDeleteMetadata: configFile.autoDeleteMetadata,
      autoDeleteAria2FilesOnRemove: configFile.autoDeleteAria2FilesOnRemove,
      autoDeleteAria2FilesOnSchedule: configFile.autoDeleteAria2FilesOnSchedule
    })
  }

  // 保存配置信息
  async saveConfig(req: Request, res: Response): Promise<void> {
    try {
      console.log('Saving config with data:', req.body)

      const configPath = getConfigPath()
      let existingConfig: SystemConfig = { ...defaultConfig }

      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8')
        existingConfig = JSON.parse(configData)
      }

      const configFile: SystemConfig = { ...existingConfig }

      if (req.body.aria2RpcUrl !== undefined) {
        configFile.aria2RpcUrl = req.body.aria2RpcUrl
      }
      if (req.body.aria2RpcSecret !== undefined && req.body.aria2RpcSecret !== '') {
        configFile.aria2RpcSecret = req.body.aria2RpcSecret
      }
      if (req.body.downloadDir !== undefined) {
        configFile.downloadDir = req.body.downloadDir
      }
      if (req.body.aria2ConfigPath !== undefined) {
        configFile.aria2ConfigPath = req.body.aria2ConfigPath
      }
      if (req.body.autoDeleteMetadata !== undefined) {
        configFile.autoDeleteMetadata = req.body.autoDeleteMetadata
      }
      if (req.body.autoDeleteAria2FilesOnRemove !== undefined) {
        configFile.autoDeleteAria2FilesOnRemove = req.body.autoDeleteAria2FilesOnRemove
      }
      if (req.body.autoDeleteAria2FilesOnSchedule !== undefined) {
        configFile.autoDeleteAria2FilesOnSchedule = req.body.autoDeleteAria2FilesOnSchedule
      }
      if (req.body.authPassword !== undefined) {
        configFile.authPassword = req.body.authPassword
      }

      console.log('Final config to save:', configFile)

      const configDir = path.dirname(configPath)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }

      fs.writeFileSync(configPath, JSON.stringify(configFile, null, 2))

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
