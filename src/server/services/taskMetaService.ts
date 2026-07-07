/**
 * 任务增强元数据服务
 *
 * 在应用层维护 aria2 不提供但本项目需要的任务增强数据
 * （添加时间、结束时间等），以 gid 为键与 aria2 任务关联。
 *
 * 设计要点：
 * - 内存 Map 懒加载 + 防抖落盘到 task-meta.json（原子写）。
 * - 创建/迁移/删除等离散事件立即落盘（关键数据不可丢）；
 *   状态同步（scheduler 高频调用）走防抖合并写。
 * - gid 不稳定（重试会换新 gid）：retryTask 时通过 migrateGid 迁移条目并保留 createdAt。
 * - 孤儿清理：aria2 中已彻底消失的 gid 才从元数据删除。
 */
import { getTaskMetaPath } from '../config/paths'
import { readJsonSync, writeJsonAtomicSync } from './jsonStore'
import type { Aria2Task, Aria2TaskStatus } from '../../shared/types/aria2'
import type { TaskMeta, TaskMetaStore } from '../../shared/types/taskMeta'

// 任务终态：进入这些状态后视为「结束」，记录 finishedAt
const TERMINAL_STATUSES: ReadonlySet<Aria2TaskStatus> = new Set<Aria2TaskStatus>([
  'complete',
  'error',
  'removed'
])

// 防抖落盘延迟：scheduler 每 30 秒同步一次，可能产生多条变更，合并成一次写
const SAVE_DEBOUNCE_MS = 3000

class TaskMetaService {
  private metaPath: string
  private store: TaskMetaStore | null = null
  private dirty = false
  private saveTimer: NodeJS.Timeout | null = null

  constructor() {
    this.metaPath = getTaskMetaPath()
  }

  // 懒加载：首次访问时从磁盘读取，失败则用空结构
  private ensureLoaded(): TaskMetaStore {
    if (this.store) return this.store
    const loaded = readJsonSync<TaskMetaStore>(this.metaPath, { version: 1, tasks: {} })
    // 容错：结构异常时退化为空
    this.store = loaded && loaded.tasks && typeof loaded.tasks === 'object'
      ? loaded
      : { version: 1, tasks: {} }
    return this.store
  }

  // 记录任务创建
  recordCreated(gid: string): void {
    const store = this.ensureLoaded()
    // 已存在则不覆盖 createdAt（避免重复调用丢失原始时间）
    if (!store.tasks[gid]) {
      store.tasks[gid] = {
        gid,
        createdAt: Date.now(),
        finishedAt: null,
        lastStatus: 'waiting'
      }
    }
    this.flush()
  }

  // 迁移 gid（重试场景）：保留原 createdAt，把旧条目搬到新 gid
  migrateGid(oldGid: string, newGid: string): void {
    const store = this.ensureLoaded()
    const existing = store.tasks[oldGid]
    if (existing) {
      store.tasks[newGid] = {
        ...existing,
        gid: newGid,
        // 重置为未结束状态（新任务重新开始下载）
        finishedAt: null,
        lastStatus: 'waiting'
      }
      delete store.tasks[oldGid]
      // 注意：inferred 通过 ...existing 继承——外部任务的重试仍标记为近似
    } else {
      // 旧条目不存在（如重启后元数据丢失），按新建处理
      store.tasks[newGid] = {
        gid: newGid,
        createdAt: Date.now(),
        finishedAt: null,
        lastStatus: 'waiting'
      }
    }
    this.flush()
  }

  // 删除任务元数据
  remove(gid: string): void {
    const store = this.ensureLoaded()
    if (store.tasks[gid]) {
      delete store.tasks[gid]
      this.flush()
    }
  }

  /**
   * 同步 aria2 当前任务列表到元数据。两条职责：
   * 1. 检测 active→终态 的状态翻转，记录 finishedAt（只写一次）；
   *    首次见到的任务回填 createdAt。
   * 2. 清理孤儿：元数据里有、但 aria2 中已不存在的 gid。
   * 走防抖落盘。
   */
  syncStates(tasks: Aria2Task[]): void {
    const store = this.ensureLoaded()
    const now = Date.now()
    const liveGids = new Set<string>()

    for (const task of tasks) {
      liveGids.add(task.gid)
      const meta = store.tasks[task.gid]

      if (!meta) {
        // 任务先于本服务存在（如重启后首次见到、或外部添加的任务）→ 回填。
        // 时间为近似（无法得知真实添加/结束时间），标记 inferred=true。
        const status = task.status
        store.tasks[task.gid] = {
          gid: task.gid,
          createdAt: now,
          // 首次发现即终态：无法得知真实结束时间，标记为发现时刻，避免 finishedAt 永远为 null
          finishedAt: TERMINAL_STATUSES.has(status) ? now : null,
          lastStatus: status,
          inferred: true
        }
        this.dirty = true
        continue
      }

      // 状态翻转：从非终态变为终态 → 记录结束时间（只写一次）
      if (
        meta.finishedAt === null &&
        !TERMINAL_STATUSES.has(meta.lastStatus) &&
        TERMINAL_STATUSES.has(task.status)
      ) {
        meta.finishedAt = now
        this.dirty = true
      }

      if (meta.lastStatus !== task.status) {
        meta.lastStatus = task.status
        this.dirty = true
      }
    }

    // 清理孤儿：元数据里有、aria2 liveGids 里没有的
    for (const gid of Object.keys(store.tasks)) {
      if (!liveGids.has(gid)) {
        delete store.tasks[gid]
        this.dirty = true
      }
    }

    this.scheduleSave()
  }

  // 读取单个任务元数据（纯内存读）
  get(gid: string): TaskMeta | undefined {
    return this.ensureLoaded().tasks[gid]
  }

  // 读取全部元数据（纯内存读）
  getAll(): Record<string, TaskMeta> {
    return this.ensureLoaded().tasks
  }

  // 防抖落盘
  private scheduleSave(): void {
    if (!this.dirty) return
    if (this.saveTimer) return // 已有待触发的定时器，合并等待
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.flush()
    }, SAVE_DEBOUNCE_MS)
  }

  // 立即落盘（关键操作用）
  private flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    const store = this.ensureLoaded()
    try {
      writeJsonAtomicSync(this.metaPath, store)
      this.dirty = false
    } catch (error) {
      console.error('[taskMetaService] Failed to flush task meta:', (error as Error).message)
    }
  }
}

export default new TaskMetaService()
