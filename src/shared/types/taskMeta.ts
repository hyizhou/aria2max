/**
 * 任务增强元数据类型定义
 *
 * aria2 本身不提供任务的添加时间、结束时间等信息。
 * 本项目通过 taskMetaService 在应用层维护这些增强数据，
 * 以 gid 为键与 aria2 任务关联。
 */
import type { Aria2TaskStatus } from './aria2'

// 单个任务的增强元数据
export interface TaskMeta {
  gid: string
  // 任务添加时间（ms 时间戳）。由本服务在创建任务时记录；
  // 若任务先于本服务存在（如重启后首次发现），退化为「首次发现时间」
  createdAt: number
  // 任务结束时间（ms 时间戳）。检测到状态翻转为终态时记录，只写一次；
  // 未结束为 null
  finishedAt: number | null
  // 最后一次观察到的 aria2 任务状态
  lastStatus: Aria2TaskStatus
  // 内容指纹（infoHash 或归一化 uri 的哈希），用于未来「重复链接识别」等功能。
  // 本期不写入，预留字段
  sourceKey?: string | null
  // 时间是否为「回填近似」。true 表示任务非本项目添加（如其他面板、aria2 命令），
  // createdAt/finishedAt 是 scheduler 首次发现时回填的，非真实添加/结束时间。
  // 由本项目 recordCreated 创建的任务不设此字段（视为 false / 真实记录）。
  inferred?: boolean
}

// 落盘文件的顶层结构
export interface TaskMetaStore {
  // schema 版本号，未来字段迁移用
  version: 1
  tasks: Record<string, TaskMeta>
}
