// 任务管理控制器
import { Request, Response, NextFunction } from 'express'
import aria2Client from '../config/aria2'
import type { Aria2Task, TaskListResponse, AddTaskResponse } from '../../shared/types'

interface TaskController {
  getTasks(req: Request, res: Response): Promise<void>
  addTask(req: Request, res: Response): Promise<void>
  getTaskDetail(req: Request, res: Response): Promise<void>
  pauseTask(req: Request, res: Response): Promise<void>
  resumeTask(req: Request, res: Response): Promise<void>
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
    res.status(201).json({ gid })
  }

  // 删除下载任务
  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { gid } = req.params
    const { deleteFile } = req.query

    if (!gid) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'GID is required'
        }
      })
      return
    }

    try {
      let taskDetails = null
      if (deleteFile === 'true') {
        try {
          taskDetails = await aria2Client.getTaskDetail(gid)
        } catch (detailError) {
          const err = detailError as Error
          console.log('Failed to get task details for file deletion:', err.message)
        }
      }

      await aria2Client.removeTask(gid)

      if (deleteFile === 'true' && taskDetails && taskDetails.files && taskDetails.files.length > 0) {
        try {
          let filePathToDelete: string | null = null

          if (taskDetails.bittorrent && taskDetails.bittorrent.info && taskDetails.bittorrent.info.name) {
            const btName = taskDetails.bittorrent.info.name
            const firstFilePath = taskDetails.files[0].path

            if (firstFilePath) {
              const possiblePaths: string[] = []

              const fileDir = firstFilePath.substring(0, firstFilePath.lastIndexOf('/'))
              if (fileDir) {
                possiblePaths.push(fileDir)
                possiblePaths.push(fileDir + '/' + btName)
              }

              possiblePaths.push(btName)

              const pathParts = firstFilePath.split('/')
              for (let i = pathParts.length - 1; i >= 0; i--) {
                if (pathParts[i] === btName) {
                  possiblePaths.push(pathParts.slice(0, i + 1).join('/'))
                  break
                }
              }

              for (const path of possiblePaths) {
                try {
                  await aria2Client.testFileExists(path)
                  filePathToDelete = path
                  console.log(`Found BT directory to delete: ${path}`)
                  break
                } catch {
                  continue
                }
              }

              if (!filePathToDelete && firstFilePath) {
                try {
                  await aria2Client.testFileExists(firstFilePath)
                  filePathToDelete = firstFilePath
                  console.log(`BT directory not found, deleting first file: ${firstFilePath}`)
                } catch {
                  console.log(`BT directory and first file not found, skipping file deletion`)
                }
              }
            }
          } else {
            filePathToDelete = taskDetails.files[0].path
            console.log(`Non-BT task, deleting file: ${filePathToDelete}`)
          }

          if (filePathToDelete) {
            await aria2Client.deleteFile(filePathToDelete)
          }
        } catch (fileError) {
          console.error('Failed to delete file:', fileError)
        }
      }

      res.json({ success: true })
    } catch (error) {
      const err = error as Error & { response?: { status: number } }
      console.error('Failed to delete task:', error)

      if (err.response && err.response.status === 400) {
        const newErr = new Error('Invalid task ID or task does not exist: ' + (err.message || 'Unknown error')) as Error & { statusCode?: number }
        newErr.statusCode = 400
        next(newErr)
        return
      } else if (err.response && err.response.status === 404) {
        const newErr = new Error('Task not found: ' + (err.message || 'Unknown error')) as Error & { statusCode?: number }
        newErr.statusCode = 404
        next(newErr)
        return
      }
      next(error)
    }
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
