// API 路由配置
const express = require('express')
const router = express.Router()

// 导入控制器
const taskController = require('../controllers/taskController')
const fileController = require('../controllers/fileController')
const systemController = require('../controllers/systemController')

// 任务管理路由
router.get('/tasks', taskController.getTasks)
router.post('/tasks', taskController.addTask)
router.post('/tasks/torrent', taskController.addTorrentTask)
router.post('/tasks/metalink', taskController.addMetalinkTask)
router.get('/tasks/:gid', taskController.getTaskDetail)
router.put('/tasks/:gid/pause', taskController.pauseTask)
router.put('/tasks/:gid/resume', taskController.resumeTask)
router.delete('/tasks/:gid', taskController.deleteTask)
router.post('/tasks/auto-delete-metadata', taskController.autoDeleteMetadata)

// 文件管理路由
router.get('/files', fileController.getFiles)
router.get('/files/download', fileController.downloadFile)
router.delete('/files', fileController.deleteFile)
router.post('/files/mkdir', fileController.createDirectory)
router.put('/files/rename', fileController.renameFile)
router.post('/files/upload', fileController.uploadFile)

// 系统配置路由
router.get('/system/status', systemController.getSystemStatus)
router.get('/system/info', systemController.getSystemInfo)
router.get('/system/config', systemController.getConfig)
router.put('/system/config', systemController.saveConfig)
router.post('/system/test-connection', systemController.testConnection)
router.get('/system/realtime-speed', systemController.getRealtimeSpeed)

module.exports = router