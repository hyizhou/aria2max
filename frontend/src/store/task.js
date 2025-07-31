import { defineStore } from 'pinia'
import { taskApi } from '@/services'

// Task store
export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [],
    loading: false,
    currentTask: null
  }),
  
  actions: {
    async fetchTasks() {
      this.loading = true
      try {
        const response = await taskApi.getTasks()
        // 显示所有任务状态，包括removed状态（为了兼容性）
        this.tasks = response.tasks
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async fetchTaskDetail(gid) {
      this.loading = true
      try {
        const response = await taskApi.getTaskDetail(gid)
        this.currentTask = response
      } catch (error) {
        console.error('Failed to fetch task detail:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async addTask(uri, options) {
      try {
        const response = await taskApi.addTask({ uri, options })
        // 添加成功后刷新任务列表
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to add task:', error)
        throw error
      }
    },
    
    async addTorrentFile(file, options) {
      try {
        const response = await taskApi.addTorrentFile(file, options)
        // 添加成功后刷新任务列表
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to add torrent file:', error)
        throw error
      }
    },
    
    async addMetalinkFile(file, options) {
      try {
        const response = await taskApi.addMetalinkFile(file, options)
        // 添加成功后刷新任务列表
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to add metalink file:', error)
        throw error
      }
    },
    
    async pauseTask(gid) {
      try {
        const response = await taskApi.pauseTask(gid)
        // 操作成功后刷新任务列表
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to pause task:', error)
        throw error
      }
    },
    
    async resumeTask(gid) {
      try {
        const response = await taskApi.resumeTask(gid)
        // 操作成功后刷新任务列表
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to resume task:', error)
        throw error
      }
    },
    
    async deleteTask(gid, deleteFile = false) {
      try {
        const response = await taskApi.deleteTask(gid, deleteFile)
        // 删除成功后刷新任务列表
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to delete task:', error)
        // Re-throw the error so it can be handled by the calling function
        throw error
      }
    }
  }
})