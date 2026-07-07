import * as path from 'path'

// 统一的配置文件路径
// 所有模块都应通过此函数获取 config.json 路径，避免路径计算不一致
export function getConfigPath(): string {
  return path.join(__dirname, '../../config.json')
}

// 任务增强元数据文件路径（与 config.json 同目录，运行时生成）
export function getTaskMetaPath(): string {
  return path.join(__dirname, '../../task-meta.json')
}
