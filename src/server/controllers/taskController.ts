// 任务管理控制器
import { Request, Response, NextFunction } from 'express'
import aria2Client from '../config/aria2'
import fileService from '../services/fileService'
import taskMetaService from '../services/taskMetaService'
import type { Aria2Task, Aria2TaskDetail, TaskListResponse, AddTaskResponse } from '../../shared/types'

interface TaskController {
  getTasks(req: Request, res: Response): Promise<void>
  addTask(req: Request, res: Response): Promise<void>
  getTaskDetail(req: Request, res: Response): Promise<void>
  pauseTask(req: Request, res: Response): Promise<void>
  resumeTask(req: Request, res: Response): Promise<void>
  retryTask(req: Request, res: Response): Promise<void>
  addTorrentTask(req: Request, res: Response): Promise<void>
  addMetalinkTask(req: Request, res: Response): Promise<void>
  deleteTask(req: Request, res: Response, next: NextFunction): Promise<void>
  autoDeleteMetadata(req: Request, res: Response): Promise<void>
  cleanMetadataTasks(req: Request, res: Response): Promise<void>
}

class TaskControllerImpl implements TaskController {
  // 获取下载任务列表
  async getTasks(_req: Request, res: Response): Promise<void> {
    const tasks = await aria2Client.getTasks()

    if (tasks && tasks.length > 0) {
      const completedTasks = tasks.filter((task: Aria2Task) => task.status === 'complete')

      for (const task of completedTasks) {
        try {
          await aria2Client.autoDeleteMetadata(task)
        } catch (autoDeleteError) {
          const err = autoDeleteError as Error
          console.error(`Failed to auto delete metadata for task ${task.gid}:`, err.message)
        }
      }
    }

    // 合并任务增强元数据（添加时间 / 结束时间等），供前端展示
    for (const task of tasks) {
      const meta = taskMetaService.get(task.gid)
      if (meta) {
        task.meta = meta
      }
    }

    const response: TaskListResponse = { tasks }
    res.json(response)
  }

  // 添加下载任务
  async addTask(req: Request, res: Response): Promise<void> {
    const { uri, options } = req.body

    if (!uri) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'URI is required'
        }
      })
      return
    }

    const gid = await aria2Client.addTask(uri, options)
    taskMetaService.recordCreated(gid)
    const response: AddTaskResponse = { gid }
    res.status(201).json(response)
  }

  // 获取任务详情
  async getTaskDetail(req: Request, res: Response): Promise<void> {
    const { gid } = req.params

    if (!gid) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'GID is required'
        }
      })
      return
    }

    const task = await aria2Client.getTaskDetail(gid)
    // 合并任务增强元数据
    const meta = taskMetaService.get(gid)
    if (meta) {
      task.meta = meta
    }
    res.json(task)
  }

  // 暂停下载任务
  async pauseTask(req: Request, res: Response): Promise<void> {
    const { gid } = req.params

    if (!gid) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'GID is required'
        }
      })
      return
    }

    await aria2Client.pauseTask(gid)
    res.json({ success: true })
  }

  // 继续下载任务
  async resumeTask(req: Request, res: Response): Promise<void> {
    const { gid } = req.params

    if (!gid) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'GID is required'
        }
      })
      return
    }

    await aria2Client.resumeTask(gid)
    res.json({ success: true })
  }

  // 重试任务（失败或已完成）。已完成任务重试会删除旧文件重新下载，
  // 删除前需客户端确认（deleteFile=true），避免误删。
  async retryTask(req: Request, res: Response): Promise<void> {
    const { gid } = req.params
    const { deleteFile } = req.query

    if (!gid) {
      res.status(400).json({ error: { code: 400, message: 'GID is required' } })
      return
    }

    const task = await aria2Client.getTaskDetail(gid)

    // 仅失败(error)与已完成(complete)任务可重试；活跃/等待中的任务重试无意义
    if (task.status !== 'error' && task.status !== 'complete') {
      res.status(400).json({ error: { code: 400, message: 'Only failed or completed tasks can be retried' } })
      return
    }

    // BT 任务（已有 bittorrent 信息，说明 METADATA 已获取）用 infoHash 构造磁力链接重试
    // 避免使用原始磁力链接导致重新下载 METADATA
    const infoHash = (task as any).infoHash || task.bittorrent?.info?.infoHash
    let uris = task.bittorrent?.info?.name && infoHash
      ? [`magnet:?xt=urn:btih:${infoHash}`]
      : task.files?.[0]?.uris?.map(u => u.uri).filter(Boolean) || []

    if (uris.length === 0 && infoHash) {
      uris.push(`magnet:?xt=urn:btih:${infoHash}`)
    }

    if (uris.length === 0) {
      res.status(400).json({ error: { code: 400, message: 'No downloadable URIs found for this task' } })
      return
    }

    // 已完成任务：检查旧下载文件是否存在（容器路径映射到宿主机）
    const isComplete = task.status === 'complete'
    let fileExists = false
    const aria2DownloadDir = task.dir || null
    if (isComplete) {
      try {
        const firstFilePath = task.files?.[0]?.path
        if (firstFilePath) {
          const isBt = !!(task.bittorrent?.info?.name)
          const targetPath = isBt
            ? await this.resolveBtPath(firstFilePath, task.bittorrent!.info!.name, aria2DownloadDir)
            : await fileService.resolveAria2TaskPath(firstFilePath, aria2DownloadDir)
          fileExists = await fileService.exists(targetPath)
        }
      } catch (err) {
        console.error(`[Task Retry] Failed to check existing file for ${gid}:`, (err as Error).message)
      }
    }

    // 旧文件存在且未确认删除 → 返回 needsConfirm，由前端弹确认
    if (fileExists && deleteFile !== 'true') {
      res.status(409).json({
        error: {
          code: 409,
          message: '该任务已下载完成，重试将删除旧文件并重新下载',
          needsConfirm: true,
          fileExists: true
        }
      })
      return
    }

    const dir = task.dir || undefined

    // 确认后删除旧文件（必须在 addTask 之前，避免 aria2 命中旧文件而跳过下载）
    if (fileExists && deleteFile === 'true') {
      try {
        await this.deleteTaskFiles(task, aria2DownloadDir)
      } catch (err) {
        console.error(`[Task Retry] Failed to delete old file for ${gid}:`, (err as Error).message)
      }
    }

    const newGid = await aria2Client.addTask(uris, dir ? { dir } : {})

    // 重试视为一次新下载：新任务添加时间记为现在，已用时长等重置；清理旧任务元数据
    taskMetaService.recordCreated(newGid)
    taskMetaService.remove(gid)

    try {
      await aria2Client.removeTask(gid)
    } catch (e) {
      console.error(`[Task Retry] Failed to remove old task ${gid}:`, (e as Error).message)
    }

    const response: AddTaskResponse = { gid: newGid }
    res.status(201).json(response)
  }

  // 添加种子文件任务
  async addTorrentTask(req: Request, res: Response): Promise<void> {
    if (!req.files || !req.files.torrent) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Torrent file is required'
        }
      })
      return
    }

    const torrentFile = Array.isArray(req.files.torrent) ? req.files.torrent[0] : req.files.torrent
    const options = req.body.options ? JSON.parse(req.body.options) : {}

    const torrentData = torrentFile.data.toString('base64')

    const gid = await aria2Client.addTorrent(torrentData, options)
    taskMetaService.recordCreated(gid)
    res.status(201).json({ gid })
  }

  // 添加Metalink文件任务
  async addMetalinkTask(req: Request, res: Response): Promise<void> {
    if (!req.files || !req.files.metalink) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Metalink file is required'
        }
      })
      return
    }

    const metalinkFile = Array.isArray(req.files.metalink) ? req.files.metalink[0] : req.files.metalink
    const options = req.body.options ? JSON.parse(req.body.options) : {}

    const metalinkData = metalinkFile.data.toString('base64')

    const gid = await aria2Client.addMetalink(metalinkData, options)
    taskMetaService.recordCreated(gid)
    res.status(201).json({ gid })
  }

  // 删除下载任务（任务删除与文件删除各自独立）
  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { gid } = req.params
    const { deleteFile } = req.query

    if (!gid) {
      res.status(400).json({ error: { code: 400, message: 'GID is required' } })
      return
    }

    try {
      // ---- 阶段 1：如果要删文件，先获取任务详情和 aria2 路径信息 ----
      // 必须在 removeTask 之前获取，否则任务删了就拿不到了
      let taskDetails: Aria2TaskDetail | null = null
      let aria2DownloadDir: string | null = null

      if (deleteFile === 'true') {
        try {
          const [details, globalOptions] = await Promise.all([
            aria2Client.getTaskDetail(gid),
            aria2Client.getGlobalOptions()
          ])
          taskDetails = details
          // 优先使用任务自身的 dir（准确反映该任务的实际下载目录），回退到全局 dir
          aria2DownloadDir = details?.dir || globalOptions?.dir || null
          console.log(`[Task Delete] Got task details for ${gid}, taskDir: ${details?.dir || 'N/A'}, globalDir: ${globalOptions?.dir || 'N/A'}, files: ${details?.files?.length || 0}, first path: ${details?.files?.[0]?.path || 'N/A'}`)
        } catch (err) {
          console.error(`[Task Delete] Failed to get task details for file deletion (gid: ${gid}):`, (err as Error).message)
        }
      }

      // ---- 阶段 2：从 aria2 移除任务 ----
      await aria2Client.removeTask(gid)
      console.log(`[Task Delete] Task ${gid} removed from aria2`)

      // 同步清理任务增强元数据
      taskMetaService.remove(gid)

      // ---- 阶段 3：删除本地文件（独立于任务删除） ----
      let fileResult: { success: boolean; message?: string } | null = null

      if (deleteFile === 'true') {
        fileResult = await this.deleteTaskFiles(taskDetails, aria2DownloadDir)
      }

      res.json({
        success: true,
        fileDeleted: deleteFile === 'true' ? fileResult?.success ?? false : undefined,
        fileDeleteMessage: fileResult?.message
      })
    } catch (error) {
      const err = error as Error & { response?: { status: number } }
      console.error('[Task Delete] Failed:', error)

      if (err.response?.status === 400) {
        next(Object.assign(new Error('Invalid task ID or task does not exist: ' + err.message), { statusCode: 400 }))
        return
      }
      if (err.response?.status === 404) {
        next(Object.assign(new Error('Task not found: ' + err.message), { statusCode: 404 }))
        return
      }
      next(error)
    }
  }

  // 根据 aria2 任务详情删除对应的本地文件
  private async deleteTaskFiles(
    taskDetails: Aria2TaskDetail | null,
    aria2DownloadDir: string | null
  ): Promise<{ success: boolean; message?: string }> {
    if (!taskDetails) {
      return { success: false, message: 'Cannot get task details, file not deleted' }
    }
    if (!taskDetails.files || taskDetails.files.length === 0) {
      return { success: false, message: 'No files associated with task' }
    }

    const firstFilePath = taskDetails.files[0].path
    if (!firstFilePath) {
      return { success: false, message: 'File path is empty' }
    }

    try {
      const isBt = !!(taskDetails.bittorrent?.info?.name)
      const targetPath = isBt
        ? await this.resolveBtPath(firstFilePath, taskDetails.bittorrent!.info!.name, aria2DownloadDir)
        : await fileService.resolveAria2TaskPath(firstFilePath, aria2DownloadDir)

      console.log(`[Task Delete] ${isBt ? 'BT' : 'Non-BT'} task, deleting: ${targetPath}`)
      return await fileService.deleteByAbsolutePath(targetPath)
    } catch (error) {
      const message = (error as Error).message
      console.error('[Task Delete] File deletion failed:', message)
      return { success: false, message }
    }
  }

  // 解析 BT 任务的下载目录
  // BT 下载通常是：aria2Dir/torrentName/ 子文件
  // aria2 返回的是子文件路径，我们需要找到整个 torrentName 目录
  private async resolveBtPath(
    firstFilePath: string,
    btName: string,
    aria2DownloadDir: string | null
  ): Promise<string> {
    // 可能的目录路径候选（均为映射到宿主机后的路径）
    const candidates: string[] = []

    // 基于第一个文件路径推导候选目录
    const fileDir = firstFilePath.substring(0, firstFilePath.lastIndexOf('/'))
    if (fileDir) {
      candidates.push(fileDir)                    // aria2Dir/torrentName
      candidates.push(fileDir + '/' + btName)     // aria2Dir/torrentName/torrentName（嵌套情况）
    }
    candidates.push(btName)                        // 直接用种子名

    // 从完整路径中找包含 btName 的层级
    const parts = firstFilePath.split('/')
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] === btName) {
        candidates.push(parts.slice(0, i + 1).join('/'))
        break
      }
    }

    // 将所有候选路径映射到宿主机路径并检查存在性
    for (const candidate of candidates) {
      const resolved = await fileService.resolveAria2TaskPath(candidate, aria2DownloadDir)
      if (await fileService.exists(resolved)) {
        console.log(`[Task Delete] Found BT directory: ${resolved}`)
        return resolved
      }
    }

    // 都没找到，回退到第一个文件的路径
    const fallback = await fileService.resolveAria2TaskPath(firstFilePath, aria2DownloadDir)
    console.log(`[Task Delete] BT directory not found, fallback to first file: ${fallback}`)
    return fallback
  }

  // 自动删除元数据
  async autoDeleteMetadata(_req: Request, res: Response): Promise<void> {
    const tasks = await aria2Client.getTasks()

    const completedTasks = tasks.filter((task: Aria2Task) => task.status === 'complete')

    let deletedCount = 0

    for (const task of completedTasks) {
      try {
        await aria2Client.autoDeleteMetadata(task)
        deletedCount++
      } catch (autoDeleteError) {
        const err = autoDeleteError as Error
        console.error(`Failed to auto delete metadata for task ${task.gid}:`, err.message)
      }
    }

    res.json({
      success: true,
      message: `Processed ${completedTasks.length} completed tasks, auto-deleted metadata for ${deletedCount} tasks`
    })
  }

  // 清理元数据任务
  async cleanMetadataTasks(_req: Request, res: Response): Promise<void> {
    const tasks = await aria2Client.getTasks()
    const metadataTasks: Array<{ gid: string; name: string; status: string }> = []

    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        let taskName = ''

        if (task.bittorrent && task.bittorrent.info && task.bittorrent.info.name) {
          taskName = task.bittorrent.info.name
        } else if (task.files && task.files.length > 0) {
          const filePath = task.files[0].path
          taskName = filePath.split('/').pop() || filePath
        }

        if (taskName.startsWith('[METADATA]') && task.status === 'complete') {
          metadataTasks.push({
            gid: task.gid,
            name: taskName,
            status: task.status
          })

          try {
            await aria2Client.removeTask(task.gid)
          } catch (deleteError) {
            const err = deleteError as Error
            console.error(`Failed to delete metadata task ${task.gid}:`, err.message)
          }
        }
      }
    }

    res.json({
      success: true,
      message: `已清理 ${metadataTasks.length} 个已完成的元数据任务`,
      deletedTasks: metadataTasks
    })
  }
}

export default new TaskControllerImpl()
