import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import TaskList from '@/views/TaskList.vue'
import TaskDetail from '@/views/TaskDetail.vue'
import FileManager from '@/views/FileManager.vue'
import Settings from '@/views/Settings.vue'
import SystemStatus from '@/views/SystemStatus.vue'
import AddTask from '@/views/AddTask.vue'
import Test from '@/views/Test.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/tasks',
    name: 'TaskList',
    component: TaskList
  },
  {
    path: '/tasks/:gid',
    name: 'TaskDetail',
    component: TaskDetail,
    props: true
  },
  {
    path: '/files',
    name: 'FileManager',
    component: FileManager
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings
  },
  {
    path: '/system-status',
    name: 'SystemStatus',
    component: SystemStatus
  },
  {
    path: '/add-task',
    name: 'AddTask',
    component: AddTask
  },
  {
    path: '/test',
    name: 'Test',
    component: Test
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router