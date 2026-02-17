// API 路由配置
import { Router } from 'express'
import taskController from '../controllers/taskController'
import fileController from '../controllers/fileController'
import systemController from '../controllers/systemController'

const router = Router()

// 任务管理路由
router.get('/tasks', taskController.getTasks.bind(taskController))
router.post('/tasks', taskController.addTask.bind(taskController))
router.post('/tasks/torrent', taskController.addTorrentTask.bind(taskController))
router.post('/tasks/metalink', taskController.addMetalinkTask.bind(taskController))
router.get('/tasks/:gid', taskController.getTaskDetail.bind(taskController))
router.put('/tasks/:gid/pause', taskController.pauseTask.bind(taskController))
router.put('/tasks/:gid/resume', taskController.resumeTask.bind(taskController))
router.delete('/tasks/:gid', taskController.deleteTask.bind(taskController))
router.post('/tasks/auto-delete-metadata', taskController.autoDeleteMetadata.bind(taskController))
router.post('/tasks/clean-metadata', taskController.cleanMetadataTasks.bind(taskController))

// 文件管理路由
router.get('/files', fileController.getFiles.bind(fileController))
router.get('/files/download', fileController.downloadFile.bind(fileController))
router.delete('/files', fileController.deleteFile.bind(fileController))
router.post('/files/mkdir', fileController.createDirectory.bind(fileController))
router.put('/files/rename', fileController.renameFile.bind(fileController))
router.post('/files/upload', fileController.uploadFile.bind(fileController))

// 系统配置路由
router.get('/system/status', systemController.getSystemStatus.bind(systemController))
router.get('/system/info', systemController.getSystemInfo.bind(systemController))
router.get('/system/config', systemController.getConfig.bind(systemController))
router.put('/system/config', systemController.saveConfig.bind(systemController))
router.post('/system/test-connection', systemController.testConnection.bind(systemController))
router.get('/system/realtime-speed', systemController.getRealtimeSpeed.bind(systemController))
router.get('/system/device-network-speed', systemController.getDeviceNetworkSpeed.bind(systemController))

export default router
