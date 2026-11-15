// 系统配置接口测试：验证敏感字段响应和空密钥保留逻辑
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Request, Response } from 'express'

import * as configPaths from '../src/server/config/paths'

class ResponseRecorder {
  body?: unknown

  json(body: unknown): this {
    this.body = body
    return this
  }
}

type SystemController = typeof import('../src/server/controllers/systemController')['default']

let controller: SystemController
let tempDir: string
let tempConfigPath: string

const initialConfig = {
  aria2RpcUrl: 'http://aria2:6800/jsonrpc',
  aria2RpcSecret: 'aria2-secret',
  downloadDir: '/data/downloads',
  aria2HostDir: '/host/downloads',
  aria2ConfigPath: '/host/aria2.conf',
  autoDeleteMetadata: true,
  autoDeleteAria2FilesOnRemove: false,
  autoDeleteAria2FilesOnSchedule: true,
  authPassword: 'auth-secret'
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'aria-max-system-config-'))
  tempConfigPath = join(tempDir, 'config.json')

  const mutableConfigPaths = configPaths as {
    getConfigPath: () => string
  }
  mutableConfigPaths.getConfigPath = () => tempConfigPath

  writeConfig(initialConfig)

  const controllerModule = await import('../src/server/controllers/systemController')
  controller = controllerModule.default
})

after(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

function writeConfig(config: Record<string, unknown>): void {
  writeFileSync(tempConfigPath, JSON.stringify(config, null, 2))
}

function readConfig(): Record<string, unknown> {
  return JSON.parse(readFileSync(tempConfigPath, 'utf8'))
}

describe('systemController config handling', () => {
  it('hides secret fields when returning config', async () => {
    const response = new ResponseRecorder()
    await controller.getConfig({} as Request, response as unknown as Response)

    assert.deepEqual(response.body, {
      ...initialConfig,
      aria2RpcSecret: '',
      authPassword: ''
    })
  })

  it('keeps stored secrets when an empty secret is submitted', async () => {
    const response = new ResponseRecorder()
    await controller.saveConfig(
      {
        body: {
          aria2RpcUrl: 'http://updated-aria2:6800/jsonrpc',
          aria2RpcSecret: '',
          authPassword: ''
        }
      } as never,
      response as unknown as Response
    )

    assert.deepEqual(response.body, { success: true })
    const savedConfig = readConfig()
    assert.equal(savedConfig.aria2RpcUrl, 'http://updated-aria2:6800/jsonrpc')
    assert.equal(savedConfig.aria2RpcSecret, 'aria2-secret')
    assert.equal(savedConfig.authPassword, 'auth-secret')
  })
})
