import { defineStore } from 'pinia'
import { taskApi } from '@/services'
import type { Aria2Task, Aria2TaskDetail, AddTaskResponse } from '@shared/types'

interface TaskState {
  tasks: Aria2Task[]
  loading: boolean
  currentTask: Aria2TaskDetail | null
}

export const useTaskStore = defineStore('task', {
  state: (): TaskState => ({
    tasks: [],
    loading: false,
    currentTask: null
  }),

  actions: {
    async fetchTasks(): Promise<void> {
      this.loading = true
      try {
        const response = await taskApi.getTasks()
        this.tasks = response.tasks
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchTaskDetail(gid: string): Promise<void> {
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

    async addTask(uri: string, options?: Record<string, string | number>): Promise<AddTaskResponse> {
      try {
        const response = await taskApi.addTask({ uri, options })
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to add task:', error)
        throw error
      }
    },

    async addTorrentFile(file: File, options?: Record<string, string | number>): Promise<AddTaskResponse> {
      try {
        const response = await taskApi.addTorrentFile(file, options)
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to add torrent file:', error)
        throw error
      }
    },

    async addMetalinkFile(file: File, options?: Record<string, string | number>): Promise<AddTaskResponse> {
      try {
        const response = await taskApi.addMetalinkFile(file, options)
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to add metalink file:', error)
        throw error
      }
    },

    async pauseTask(gid: string): Promise<{ success: boolean }> {
      try {
        const response = await taskApi.pauseTask(gid)
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to pause task:', error)
        throw error
      }
    },

    async resumeTask(gid: string): Promise<{ success: boolean }> {
      try {
        const response = await taskApi.resumeTask(gid)
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to resume task:', error)
        throw error
      }
    },

    async deleteTask(gid: string, deleteFile = false): Promise<{ success: boolean }> {
      try {
        const response = await taskApi.deleteTask(gid, deleteFile)
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to delete task:', error)
        throw error
      }
    },

    async cleanMetadataTasks(): Promise<{ success: boolean; message: string; deletedTasks: Array<{ gid: string; name: string; status: string }> }> {
      try {
        const response = await taskApi.cleanMetadataTasks()
        await this.fetchTasks()
        return response
      } catch (error) {
        console.error('Failed to clean metadata tasks:', error)
        throw error
      }
    }
  }
})
