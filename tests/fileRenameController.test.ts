import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { Response } from 'express'


const generatedConfigPath = join(__dirname, '../src/config.json')
const configExistedBeforeTests = existsSync(generatedConfigPath)
process.on('exit', () => {
  if (!configExistedBeforeTests) rmSync(generatedConfigPath, { force: true })
})

class ResponseRecorder {
  statusCode?: number
  body?: unknown

  status(code: number): this {
    this.statusCode = code
    return this
  }

  json(body: unknown): this {
    this.body = body
    return this
  }
}

type FileController = typeof import('../src/server/controllers/fileController')['default']
type FileService = typeof import('../src/server/services/fileService')['default']

let fileController: FileController
let fileService: FileService
let originalRenameFile: FileService['renameFile']

before(async () => {
  const controllerModule = await import('../src/server/controllers/fileController')
  const serviceModule = await import('../src/server/services/fileService')
  fileController = controllerModule.default
  fileService = serviceModule.default
  originalRenameFile = fileService.renameFile
})

const getErrorBody = (response: ResponseRecorder) => response.body as {
  error?: { code?: number; message?: string }
}

describe('fileController.renameFile', () => {
  after(() => {
    fileService.renameFile = originalRenameFile
    if (!configExistedBeforeTests) {
      rmSync(generatedConfigPath, { force: true })
    }
  })

  it('rejects missing paths without touching the file service', async () => {
    const calls: unknown[][] = []
    fileService.renameFile = async (...args: unknown[]) => {
      calls.push(args)
      return { success: true }
    }

    const response = new ResponseRecorder()
    await fileController.renameFile(
      { body: { oldPath: '', newPath: 'new.txt' } } as never,
      response as unknown as Response
    )

    assert.equal(response.statusCode, 400)
    assert.equal(getErrorBody(response).error?.code, 400)
    assert.equal(calls.length, 0)
  })

  it('rejects malformed target paths such as a trailing separator', async () => {
    const calls: unknown[][] = []
    fileService.renameFile = async (...args: unknown[]) => {
      calls.push(args)
      return { success: true }
    }

    const response = new ResponseRecorder()
    await fileController.renameFile(
      {
        body: { oldPath: 'downloads/file.txt', newPath: 'downloads/new.txt/' }
      } as never,
      response as unknown as Response
    )

    assert.equal(response.statusCode, 400)
    assert.equal(getErrorBody(response).error?.code, 400)
    assert.ok(getErrorBody(response).error?.message)
    assert.equal(calls.length, 0)
  })

  it('rejects a rename that changes directories', async () => {
    const calls: unknown[][] = []
    fileService.renameFile = async (...args: unknown[]) => {
      calls.push(args)
      return { success: true }
    }

    const response = new ResponseRecorder()
    await fileController.renameFile(
      {
        body: { oldPath: 'downloads/file.txt', newPath: 'documents/file.txt' }
      } as never,
      response as unknown as Response
    )

    assert.equal(response.statusCode, 400)
    assert.equal(getErrorBody(response).error?.code, 400)
    assert.equal(calls.length, 0)
  })

  it('passes same-directory renames to the file service', async () => {
    const calls: Array<[string, string]> = []
    fileService.renameFile = async (oldPath: string, newPath: string) => {
      calls.push([oldPath, newPath])
      return { success: true }
    }

    const response = new ResponseRecorder()
    await fileController.renameFile(
      {
        body: { oldPath: 'downloads/file.txt', newPath: 'downloads/new.txt' }
      } as never,
      response as unknown as Response
    )

    assert.deepEqual(calls, [['downloads/file.txt', 'downloads/new.txt']])
    assert.equal(response.statusCode, undefined)
    assert.deepEqual(response.body, { success: true })
  })

  it('returns the service failure message as an API error response', async () => {
    fileService.renameFile = async () => ({
      success: false,
      message: 'Permission denied'
    })

    const response = new ResponseRecorder()
    await fileController.renameFile(
      {
        body: { oldPath: 'downloads/file.txt', newPath: 'downloads/new.txt' }
      } as never,
      response as unknown as Response
    )

    assert.equal(response.statusCode, 500)
    assert.deepEqual(response.body, {
      error: { code: 500, message: 'Permission denied' }
    })
  })
})
