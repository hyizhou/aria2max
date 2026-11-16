// 目录下载测试 — 验证符号链接入口名用于 zip 根目录且响应可以完整生成
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { EventEmitter, PassThrough } from 'node:stream'
import AdmZip from 'adm-zip'

type FileController = typeof import('../src/server/controllers/fileController')['default']

const generatedConfigPath = path.join(__dirname, '../src/config.json')
const configBackupPath = `${generatedConfigPath}.file-download-test-backup`
const configExistedBeforeTests = existsSync(generatedConfigPath)
let configRestored = false
const workspace = mkdtempSync(path.join(os.tmpdir(), 'aria-max-download-'))
const downloadRoot = path.join(workspace, 'download-root')
const externalTarget = path.join(workspace, 'external-target')

mkdirSync(downloadRoot)
mkdirSync(externalTarget)
writeFileSync(path.join(externalTarget, 'inner.txt'), 'directory download content')
symlinkSync(externalTarget, path.join(downloadRoot, 'dir-link'))

if (configExistedBeforeTests) {
  renameSync(generatedConfigPath, configBackupPath)
}
writeFileSync(generatedConfigPath, JSON.stringify({
  downloadDir: downloadRoot,
  aria2HostDir: ''
}))

process.on('exit', () => {
  rmSync(workspace, { recursive: true, force: true })
  if (!configRestored) {
    rmSync(generatedConfigPath, { force: true })
    if (existsSync(configBackupPath)) {
      renameSync(configBackupPath, generatedConfigPath)
    }
  }
})

class MockResponse extends PassThrough {
  headers = new Map<string, string>()
  statusCode?: number
  body?: unknown

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value)
    return this
  }

  flushHeaders(): void {
    // Express emits headers here; the archive stream only needs a no-op.
  }

  status(code: number): this {
    this.statusCode = code
    return this
  }

  json(body: unknown): this {
    this.body = body
    return this
  }
}

let fileController: FileController

before(async () => {
  const controllerModule = await import('../src/server/controllers/fileController')
  fileController = controllerModule.default
})

after(() => {
  if (existsSync(configBackupPath)) {
    rmSync(generatedConfigPath, { force: true })
    renameSync(configBackupPath, generatedConfigPath)
  } else {
    rmSync(generatedConfigPath, { force: true })
  }
  configRestored = true
})

describe('fileController.downloadFile', () => {
  it('zips a symlinked directory under its lexical entry name', async () => {
    const response = new MockResponse()
    const chunks: Buffer[] = []
    const responseEnded = new Promise<void>((resolve, reject) => {
      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('end', resolve)
      response.on('error', reject)
    })

    await fileController.downloadFile(
      { query: { path: 'dir-link' } } as never,
      response as never
    )
    await responseEnded

    assert.equal(response.headers.get('content-type'), 'application/zip')
    assert.equal(
      response.headers.get('content-disposition'),
      `attachment; filename*=UTF-8''${encodeURIComponent('dir-link.zip')}`
    )

    const zip = new AdmZip(Buffer.concat(chunks))
    const entry = zip.getEntry('dir-link/inner.txt')
    assert.ok(entry)
    assert.equal(entry?.getData().toString('utf8'), 'directory download content')
  })

  it('destroys the response when archive finalization rejects without an error event', async () => {
    const response = new MockResponse()
    const responseFailed = new Promise<Error>(resolve => {
      response.once('error', resolve)
    })
    const archive = new EventEmitter() as unknown as {
      pipe: (destination: MockResponse) => unknown
      directory: (fullPath: string, fileName: string) => unknown
      finalize: () => Promise<void>
      on: (event: 'error', listener: (error: Error) => void) => unknown
    }
    const pipedDestinations: MockResponse[] = []
    const directoryCalls: Array<[string, string]> = []

    archive.pipe = destination => {
      pipedDestinations.push(destination)
      return archive
    }
    archive.directory = (fullPath: string, fileName: string) => {
      directoryCalls.push([fullPath, fileName])
      return archive
    }
    archive.finalize = () => Promise.reject(new Error('finalize failed'))

    await (
      fileController as unknown as {
        streamDirectoryArchive: (
          res: MockResponse,
          archive: unknown,
          fullPath: string,
          fileName: string
        ) => Promise<void>
      }
    ).streamDirectoryArchive(response, archive, externalTarget, 'dir-link')
    const responseError = await responseFailed

    assert.equal(responseError.message, 'finalize failed')
    assert.equal(response.destroyed, true)
    assert.deepEqual(pipedDestinations, [response])
    assert.deepEqual(directoryCalls, [[externalTarget, 'dir-link']])
  })
})
