// 调度器服务 - 用于定时任务
import aria2Client from '../config/aria2'

class SchedulerService {
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private timeouts: Map<string, NodeJS.Timeout> = new Map()

  // 启动所有定时任务
  start(): void {
    this.startAria2FileCleanup()
    console.log('[Scheduler] All scheduled tasks started')
  }

  // 停止所有定时任务
  stop(): void {
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
  startAria2FileCleanup(): void {
    const taskName = 'aria2FileCleanup'
    const intervalMs = 30 * 60 * 1000 // 30分钟

    // 立即执行一次
    this.executeAria2FileCleanup().catch(err => console.error('[Scheduler] Unhandled error during initial cleanup:', err))

    // 然后设置定时器
    const interval = setInterval(() => {
      this.executeAria2FileCleanup()
    }, intervalMs)

    this.intervals.set(taskName, interval)
    console.log(`[Scheduler] Started ${taskName} task (runs every 30 minutes)`)
  }

  // 执行.aria2文件清理
  private async executeAria2FileCleanup(): Promise<void> {
    try {
      console.log('[Scheduler] Executing .aria2 file cleanup...')
      await aria2Client.cleanupOrphanedAria2Files()
      console.log('[Scheduler] .aria2 file cleanup completed')
    } catch (error) {
      const err = error as Error
      console.error('[Scheduler] .aria2 file cleanup failed:', err.message)
    }
  }

  // 重启特定任务
  restartTask(taskName: string): void {
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
  stopTask(taskName: string): void {
    if (this.intervals.has(taskName)) {
      clearInterval(this.intervals.get(taskName)!)
      this.intervals.delete(taskName)
      console.log(`[Scheduler] Stopped task: ${taskName}`)
    }

    if (this.timeouts.has(taskName)) {
      clearTimeout(this.timeouts.get(taskName)!)
      this.timeouts.delete(taskName)
      console.log(`[Scheduler] Stopped timeout: ${taskName}`)
    }
  }

  // 获取任务状态
  getTaskStatus(): Record<string, string> {
    const status: Record<string, string> = {}

    for (const taskName of this.intervals.keys()) {
      status[taskName] = 'running'
    }

    return status
  }
}

export default new SchedulerService()
