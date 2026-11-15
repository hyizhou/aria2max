// 磁盘占用信息服务：按任意路径定位所属文件系统分区
import * as path from 'path'
import * as fs from 'fs/promises'
import si from 'systeminformation'
import type { DiskUsageInfo } from '@shared/types'

export type PartitionData = Awaited<ReturnType<typeof si.fsSize>>[number]

// 需要过滤的虚拟文件系统类型
const EXCLUDE_FS_TYPES = ['tmpfs', 'devtmpfs', 'overlay', 'squashfs', 'iso9660']

function isWithinMount(fullPath: string, mount: string): boolean {
  if (!mount) return false
  if (fullPath === mount) return true
  const separator = mount.endsWith(path.sep) ? '' : path.sep
  return fullPath.startsWith(mount + separator)
}

export function getRealPartitions(fsSizeData: PartitionData[]): PartitionData[] {
  return fsSizeData.filter(fs => !EXCLUDE_FS_TYPES.includes(fs.type) && fs.size > 0)
}

export async function findPartitionForPath(
  partitions: PartitionData[],
  targetPath: string
): Promise<PartitionData | undefined> {
  const fullPath = await fs.realpath(targetPath).catch(() => path.resolve(targetPath))
  return partitions
    .filter(fs => isWithinMount(fullPath, fs.mount))
    .sort((a, b) => b.mount.length - a.mount.length)[0]
}

function toDiskUsage(fs: PartitionData): DiskUsageInfo {
  return {
    device: fs.fs,
    total: fs.size,
    used: fs.used,
    free: fs.available,
    percentage: fs.size > 0 ? Math.round((fs.used / fs.size) * 100) : 0
  }
}

export async function getDiskUsageForPath(fullPath: string): Promise<DiskUsageInfo> {
  try {
    const partitions = getRealPartitions(await si.fsSize())
    const matched = await findPartitionForPath(partitions, fullPath)
    if (!matched) {
      return {
        device: '',
        total: 0,
        used: 0,
        free: 0,
        percentage: 0,
        error: 'No matching filesystem'
      }
    }
    return toDiskUsage(matched)
  } catch {
    return {
      device: '',
      total: 0,
      used: 0,
      free: 0,
      percentage: 0,
      error: 'Unable to get disk usage'
    }
  }
}
