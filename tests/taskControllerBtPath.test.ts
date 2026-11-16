// BT 任务删除路径解析测试 — 覆盖候选路径异常与单文件任务的下载根边界
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import * as path from 'node:path'

type FileService = typeof import('../src/server/services/fileService')['default']
type TaskController = typeof import('../src/server/controllers/taskController')['default']

const generatedConfigPath = path.join(__dirname, '../src/config.json')
const configExistedBeforeTests = existsSync(generatedConfigPath)

process.on('exit', () => {
  if (!configExistedBeforeTests) {
    rmSync(generatedConfigPath, { force: true })
  }
})

let fileService: FileService
let taskController: TaskController
let originalResolveAria2TaskPath: FileService['resolveAria2TaskPath']
let originalCheckPathExists: FileService['checkPathExists']

before(async () => {
  const serviceModule = await import('../src/server/services/fileService')
  const controllerModule = await import('../src/server/controllers/taskController')
  fileService = serviceModule.default
  taskController = controllerModule.default
  originalResolveAria2TaskPath = fileService.resolveAria2TaskPath
  originalCheckPathExists = fileService.checkPathExists
})

after(() => {
  fileService.resolveAria2TaskPath = originalResolveAria2TaskPath
  fileService.checkPathExists = originalCheckPathExists
})

async function resolveBtPath(
  firstFilePath: string,
  btName: string,
  aria2DownloadDir: string | null
): Promise<string> {
  return (taskController as unknown as {
    resolveBtPath: (
      firstFilePath: string,
      btName: string,
      aria2DownloadDir: string | null
    ) => Promise<string>
  }).resolveBtPath(firstFilePath, btName, aria2DownloadDir)
}

describe('taskController.resolveBtPath', () => {
  it('continues after a failing candidate and returns the next existing candidate', async () => {
    fileService.resolveAria2TaskPath = async aria2Path => {
      if (aria2Path === '/downloads/torrent-name') {
        throw new Error('candidate outside download root')
      }
      return `/host${aria2Path}`
    }
    fileService.checkPathExists = async () => ({ status: 'exists' })

    const result = await resolveBtPath(
      '/downloads/torrent-name/torrent-name/file.bin',
      'torrent-name',
      '/downloads'
    )

    assert.equal(result, '/host/downloads/torrent-name/torrent-name')
  })

  it('does not select the download root for a single-file torrent', async () => {
    fileService.resolveAria2TaskPath = async aria2Path => aria2Path
    fileService.checkPathExists = async fullPath => ({
      status: fullPath === '/downloads' ? 'exists' : 'missing'
    })

    const result = await resolveBtPath(
      '/downloads/torrent-name',
      'torrent-name',
      '/downloads'
    )

    assert.notEqual(result, '/downloads')
    assert.equal(result, '/downloads/torrent-name')
  })
})
