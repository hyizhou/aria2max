// 调度器服务 - 用于定时任务
const aria2Client = require('../config/aria2')

class SchedulerService {
  constructor() {
    this.intervals = new Map()
    this.timeouts = new Map()
  }

  // 启动所有定时任务
  start() {
    this.startAria2FileCleanup()
    console.log('[Scheduler] All scheduled tasks started')
  }

  // 停止所有定时任务
  stop() {
    // 清除所有定时器
    for (const [name, interval] of this.intervals) {
      clearInterval(interval)
      console.log(`[Scheduler] Stopped interval: ${name}`)
    }
    
    for (const [name, timeout] of this.timeouts) {
      clearTimeout(timeout)
      console.log(`[Scheduler] Stopped timeout: ${name}`)
    }
    
    this.intervals.clear()
    this.timeouts.clear()
    console.log('[Scheduler] All scheduled tasks stopped')
  }

  // 启动.aria2文件清理任务（每30分钟执行一次）
  startAria2FileCleanup() {
    const taskName = 'aria2FileCleanup'
    const intervalMs = 30 * 60 * 1000 // 30分钟
    
    // 立即执行一次
    this.executeAria2FileCleanup()
    
    // 然后设置定时器
    const interval = setInterval(() => {
      this.executeAria2FileCleanup()
    }, intervalMs)
    
    this.intervals.set(taskName, interval)
    console.log(`[Scheduler] Started ${taskName} task (runs every 30 minutes)`)
  }

  // 执行.aria2文件清理
  async executeAria2FileCleanup() {
    try {
      console.log('[Scheduler] Executing .aria2 file cleanup...')
      await aria2Client.cleanupOrphanedAria2Files()
      console.log('[Scheduler] .aria2 file cleanup completed')
    } catch (error) {
      console.error('[Scheduler] .aria2 file cleanup failed:', error.message)
    }
  }

  // 重启特定任务
  restartTask(taskName) {
    this.stopTask(taskName)
    
    switch (taskName) {
      case 'aria2FileCleanup':
        this.startAria2FileCleanup()
        break
      default:
        console.warn(`[Scheduler] Unknown task: ${taskName}`)
    }
  }

  // 停止特定任务
  stopTask(taskName) {
    if (this.intervals.has(taskName)) {
      clearInterval(this.intervals.get(taskName))
      this.intervals.delete(taskName)
      console.log(`[Scheduler] Stopped task: ${taskName}`)
    }
    
    if (this.timeouts.has(taskName)) {
      clearTimeout(this.timeouts.get(taskName))
      this.timeouts.delete(taskName)
      console.log(`[Scheduler] Stopped timeout: ${taskName}`)
    }
  }

  // 获取任务状态
  getTaskStatus() {
    const status = {}
    
    for (const taskName of this.intervals.keys()) {
      status[taskName] = 'running'
    }
    
    return status
  }
}

module.exports = new SchedulerService()