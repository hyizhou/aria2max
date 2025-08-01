// 任务管理控制器
const aria2Client = require('../config/aria2')
const fs = require('fs').promises

class TaskController {
  // 获取下载任务列表
  async getTasks(req, res) {
    try {
      const tasks = await aria2Client.getTasks()
      
      // 检查是否有完成的任务需要自动删除元数据
      if (tasks && tasks.length > 0) {
        // 过滤出完成的任务
        const completedTasks = tasks.filter(task => task.status === 'complete')
        
        // 对每个完成的任务检查是否需要自动删除元数据
        for (const task of completedTasks) {
          try {
            await aria2Client.autoDeleteMetadata(task)
          } catch (autoDeleteError) {
            console.error(`Failed to auto delete metadata for task ${task.gid}:`, autoDeleteError.message)
          }
        }
      }
      
      res.json({ tasks })
    } catch (error) {
      console.error('Failed to get tasks:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to get tasks' 
        } 
      })
    }
  }

  // 添加下载任务
  async addTask(req, res) {
    try {
      const { uri, options } = req.body
      
      if (!uri) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'URI is required' 
          } 
        })
      }
      
      const gid = await aria2Client.addTask(uri, options)
      res.status(201).json({ gid })
    } catch (error) {
      console.error('Failed to add task:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to add task' 
        } 
      })
    }
  }

  // 获取任务详情
  async getTaskDetail(req, res) {
    try {
      const { gid } = req.params
      
      if (!gid) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'GID is required' 
          } 
        })
      }
      
      const task = await aria2Client.getTaskDetail(gid)
      res.json(task)
    } catch (error) {
      console.error('Failed to get task detail:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to get task detail' 
        } 
      })
    }
  }

  // 暂停下载任务
  async pauseTask(req, res) {
    try {
      const { gid } = req.params
      
      if (!gid) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'GID is required' 
          } 
        })
      }
      
      await aria2Client.pauseTask(gid)
      res.json({ success: true })
    } catch (error) {
      console.error('Failed to pause task:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to pause task' 
        } 
      })
    }
  }

  // 继续下载任务
  async resumeTask(req, res) {
    try {
      const { gid } = req.params
      
      if (!gid) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'GID is required' 
          } 
        })
      }
      
      await aria2Client.resumeTask(gid)
      res.json({ success: true })
    } catch (error) {
      console.error('Failed to resume task:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to resume task' 
        } 
      })
    }
  }

    // 添加种子文件任务
  async addTorrentTask(req, res) {
    try {
      // 检查是否有文件上传
      if (!req.files || !req.files.torrent) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'Torrent file is required' 
          } 
        })
      }
      
      const torrentFile = req.files.torrent
      const options = req.body.options ? JSON.parse(req.body.options) : {}
      
      // 读取种子文件并转换为base64
      const torrentData = torrentFile.data.toString('base64')
      
      // 添加种子任务
      const gid = await aria2Client.addTorrent(torrentData, options)
      res.status(201).json({ gid })
    } catch (error) {
      console.error('Failed to add torrent task:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to add torrent task: ' + error.message
        } 
      })
    }
  }
  
  // 添加Metalink文件任务
  async addMetalinkTask(req, res) {
    try {
      // 检查是否有文件上传
      if (!req.files || !req.files.metalink) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'Metalink file is required' 
          } 
        })
      }
      
      const metalinkFile = req.files.metalink
      const options = req.body.options ? JSON.parse(req.body.options) : {}
      
      // 读取metalink文件并转换为base64
      const metalinkData = metalinkFile.data.toString('base64')
      
      // 添加metalink任务
      const gid = await aria2Client.addMetalink(metalinkData, options)
      res.status(201).json({ gid })
    } catch (error) {
      console.error('Failed to add metalink task:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to add metalink task: ' + error.message
        } 
      })
    }
  }
  
  // 删除下载任务
  async deleteTask(req, res) {
    try {
      const { gid } = req.params
      const { deleteFile } = req.query || {}
      
      if (!gid) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'GID is required' 
          } 
        })
      }
      
      // 先获取任务详情，以便在需要时删除对应的文件
      let taskDetails = null
      if (deleteFile === 'true') {
        try {
          taskDetails = await aria2Client.getTaskDetail(gid)
        } catch (detailError) {
          console.log('Failed to get task details for file deletion:', detailError.message)
        }
      }
      
      // 删除任务
      await aria2Client.removeTask(gid)
      
      // 如果需要删除文件且获取到了任务详情
      if (deleteFile === 'true' && taskDetails && taskDetails.files && taskDetails.files.length > 0) {
        try {
          // 对于BT任务，需要删除整个目录
          let filePathToDelete = null
          
          // 检查是否是BT任务
          if (taskDetails.bittorrent && taskDetails.bittorrent.info && taskDetails.bittorrent.info.name) {
            // BT任务 - 查找实际存在的目录
            const btName = taskDetails.bittorrent.info.name
            const firstFilePath = taskDetails.files[0].path
            
            if (firstFilePath) {
              // 尝试多个可能的目录路径
              const possiblePaths = []
              
              // 可能的路径1: 文件所在目录
              const fileDir = firstFilePath.substring(0, firstFilePath.lastIndexOf('/'))
              if (fileDir) {
                possiblePaths.push(fileDir)
                possiblePaths.push(fileDir + '/' + btName)
              }
              
              // 可能的路径2: 直接以BT名称为目录名
              possiblePaths.push(btName)
              
              // 可能的路径3: 从第一个文件的完整路径中提取BT目录
              const pathParts = firstFilePath.split('/')
              for (let i = pathParts.length - 1; i >= 0; i--) {
                if (pathParts[i] === btName) {
                  possiblePaths.push(pathParts.slice(0, i + 1).join('/'))
                  break
                }
              }
              
              // 尝试每个可能的路径，找到第一个存在的
              for (const path of possiblePaths) {
                try {
                  await aria2Client.testFileExists(path)
                  filePathToDelete = path
                  console.log(`Found BT directory to delete: ${path}`)
                  break
                } catch (e) {
                  // 路径不存在，继续尝试下一个
                  continue
                }
              }
              
              // 如果没有找到目录，尝试删除第一个文件
              if (!filePathToDelete && firstFilePath) {
                try {
                  await aria2Client.testFileExists(firstFilePath)
                  filePathToDelete = firstFilePath
                  console.log(`BT directory not found, deleting first file: ${firstFilePath}`)
                } catch (e) {
                  console.log(`BT directory and first file not found, skipping file deletion`)
                }
              }
            }
          } else {
            // 非BT任务 - 直接删除第一个文件
            filePathToDelete = taskDetails.files[0].path
            console.log(`Non-BT task, deleting file: ${filePathToDelete}`)
          }
          
          if (filePathToDelete) {
            await aria2Client.deleteFile(filePathToDelete)
          }
        } catch (fileError) {
          console.error('Failed to delete file:', fileError)
          // 文件删除失败不应该影响任务删除的成功，但我们记录错误
        }
      }
      
      res.json({ success: true })
    } catch (error) {
      console.error('Failed to delete task:', error)
      
      // Provide more specific error messages based on the error type
      if (error.response && error.response.status === 400) {
        res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'Invalid task ID or task does not exist: ' + (error.message || 'Unknown error') 
          } 
        })
      } else if (error.response && error.response.status === 404) {
        res.status(404).json({ 
          error: { 
            code: 404, 
            message: 'Task not found: ' + (error.message || 'Unknown error') 
          } 
        })
      } else {
        res.status(500).json({ 
          error: { 
            code: 500, 
            message: 'Failed to delete task: ' + (error.message || 'Unknown error') 
          } 
        })
      }
    }
  }
  
  // 自动删除元数据
  async autoDeleteMetadata(req, res) {
    try {
      // 获取所有任务
      const tasks = await aria2Client.getTasks()
      
      // 过滤出完成的任务
      const completedTasks = tasks.filter(task => task.status === 'complete')
      
      // 统计删除的元数据文件数量
      let deletedCount = 0
      
      // 对每个完成的任务检查是否需要自动删除元数据
      for (const task of completedTasks) {
        try {
          await aria2Client.autoDeleteMetadata(task)
          deletedCount++
        } catch (autoDeleteError) {
          console.error(`Failed to auto delete metadata for task ${task.gid}:`, autoDeleteError.message)
        }
      }
      
      res.json({ 
        success: true, 
        message: `Processed ${completedTasks.length} completed tasks, auto-deleted metadata for ${deletedCount} tasks` 
      })
    } catch (error) {
      console.error('Failed to auto delete metadata:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to auto delete metadata: ' + (error.message || 'Unknown error') 
        } 
      })
    }
  }

  // 清理元数据任务
  async cleanMetadataTasks(req, res) {
    try {
      const tasks = await aria2Client.getTasks()
      const metadataTasks = []
      
      if (tasks && tasks.length > 0) {
        // 查找名称以[METADATA]开头且状态为已完成的任务
        for (const task of tasks) {
          let taskName = ''
          
          // 获取任务名称
          if (task.bittorrent && task.bittorrent.info && task.bittorrent.info.name) {
            taskName = task.bittorrent.info.name
          } else if (task.files && task.files.length > 0) {
            const path = task.files[0].path
            taskName = path.split('/').pop() || path
          }
          
          // 检查是否为元数据任务且状态为已完成
          if (taskName.startsWith('[METADATA]') && task.status === 'complete') {
            metadataTasks.push({
              gid: task.gid,
              name: taskName,
              status: task.status
            })
            
            try {
                // 删除元数据任务，不删除文件
                await aria2Client.removeTask(task.gid)
              } catch (deleteError) {
                console.error(`Failed to delete metadata task ${task.gid}:`, deleteError.message)
              }
          }
        }
      }
      
      res.json({ 
        success: true, 
        message: `已清理 ${metadataTasks.length} 个已完成的元数据任务`,
        deletedTasks: metadataTasks
      })
    } catch (error) {
      console.error('Failed to clean metadata tasks:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to clean metadata tasks'
        } 
      })
    }
  }
}

module.exports = new TaskController()