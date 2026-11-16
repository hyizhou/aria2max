// 文件管理符号链接安全策略测试 — 覆盖路径解析、边界校验与删除根保护场景
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { normalizeRelativePath } from '../src/shared/utils/relativePath'

type FileService = typeof import('../src/server/services/fileService')['default']
type IsSamePathText = typeof import('../src/server/services/fileService')['isSamePathText']

const generatedConfigPath = path.join(__dirname, '../src/config.json')
const configExistedBeforeTests = existsSync(generatedConfigPath)
const originalConfigContent = configExistedBeforeTests
  ? readFileSync(generatedConfigPath, 'utf8')
  : null

// getFinalConfig 首次调用后会缓存配置，必须在导入服务模块前写入测试配置
const workspace = mkdtempSync(path.join(os.tmpdir(), 'aria-max-symlink-'))
const realRoot = path.join(workspace, 'real-root')
const lexicalRoot = path.join(workspace, 'lex-root')
mkdirSync(realRoot)
symlinkSync(realRoot, lexicalRoot)
writeFileSync(generatedConfigPath, JSON.stringify({ downloadDir: lexicalRoot, aria2HostDir: '' }))

process.on('exit', () => {
  if (originalConfigContent !== null) {
    writeFileSync(generatedConfigPath, originalConfigContent)
  } else {
    rmSync(generatedConfigPath, { force: true })
  }
})

describe('path existence checks distinguish errors', () => {
  it('reports existing and missing paths separately', async () => {
    const existingPath = path.join(realRoot, 'existence-file.txt')
    writeFileSync(existingPath, 'data')

    assert.deepEqual(await fileService.checkPathExists(existingPath), {
      status: 'exists'
    })
    assert.deepEqual(
      await fileService.checkPathExists(path.join(realRoot, 'missing-existence.txt')),
      { status: 'missing' }
    )
  })

  const permissionTest = process.getuid?.() === 0 ? it.skip : it
  permissionTest('reports permission failures as unknown instead of missing', async () => {
    const deniedDir = path.join(workspace, 'existence-denied')
    const deniedPath = path.join(deniedDir, 'target.txt')
    mkdirSync(deniedDir)
    writeFileSync(deniedPath, 'data')
    chmodSync(deniedDir, 0o000)

    try {
      assert.deepEqual(await fileService.checkPathExists(deniedPath), {
        status: 'unknown',
        errorCode: 'EACCES'
      })
    } finally {
      chmodSync(deniedDir, 0o700)
    }
  })
})

let fileService: FileService
let isSamePathText: IsSamePathText

before(async () => {
  const serviceModule = await import('../src/server/services/fileService')
  fileService = serviceModule.default
  isSamePathText = serviceModule.isSamePathText
})

after(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('path text comparison follows platform semantics', () => {
  it('compares win32 paths without case sensitivity and other paths exactly', () => {
    assert.equal(
      isSamePathText('C:\\Downloads\\A', 'c:\\downloads\\a', path.win32.sep),
      true
    )
    assert.equal(
      isSamePathText('/Downloads/A', '/downloads/a', path.posix.sep),
      false
    )
    assert.equal(
      isSamePathText('/downloads/a', '/downloads/a', path.posix.sep),
      true
    )
  })
})

function createBrokenLink(name: string): string {
  const missingTarget = path.join(workspace, `missing-${name}`)
  const linkPath = path.join(realRoot, name)
  symlinkSync(missingTarget, linkPath)
  return missingTarget
}

describe('issue 1: broken symlinks must not allow writes to unverified targets', () => {
  it('rejects uploads onto a broken symlink without creating its target', async () => {
    const missingTarget = createBrokenLink('broken-upload')
    const result = await fileService.uploadFile('broken-upload', Buffer.from('data'))

    assert.equal(result.success, false)
    assert.equal(result.message, 'Symbolic link target is unreachable')
    assert.equal(existsSync(missingTarget), false)
  })

  it('rejects creating directories through a broken symlink', async () => {
    createBrokenLink('broken-dir')
    const result = await fileService.createDirectory('broken-dir/child')

    assert.equal(result.success, false)
    assert.equal(result.message, 'Symbolic link target is unreachable')
  })

  it('rejects browsing and downloading a broken symlink', async () => {
    createBrokenLink('broken-browse')

    const listing = await fileService.getFiles('broken-browse')
    assert.ok(listing.error?.includes('Symbolic link target is unreachable'))

    await assert.rejects(
      () => fileService.getFullPath('broken-browse'),
      /Symbolic link target is unreachable/
    )
  })

  it('still allows deleting and renaming the broken link itself', async () => {
    createBrokenLink('broken-delete')

    const deleteResult = await fileService.deleteFile('broken-delete')
    assert.deepEqual(deleteResult, { success: true })
    assert.equal(existsSync(path.join(realRoot, 'broken-delete')), false)

    createBrokenLink('broken-rename')
    const renameResult = await fileService.renameFile('broken-rename', 'broken-renamed')
    assert.deepEqual(renameResult, { success: true })
    assert.equal(lstatSync(path.join(realRoot, 'broken-renamed')).isSymbolicLink(), true)
  })

  it('rejects renaming through a broken symlink', async () => {
    createBrokenLink('broken-rename-through')
    const result = await fileService.renameFile('broken-rename-through/child', 'renamed-child')

    assert.equal(result.success, false)
    assert.equal(result.message, 'Symbolic link target is unreachable')
  })

  it('treats symlink loops as unreachable targets', async () => {
    symlinkSync(path.join(realRoot, 'loop-b'), path.join(realRoot, 'loop-a'))
    symlinkSync(path.join(realRoot, 'loop-a'), path.join(realRoot, 'loop-b'))

    const result = await fileService.uploadFile('loop-a', Buffer.from('data'))
    assert.equal(result.success, false)
    assert.equal(result.message, 'Symbolic link target is unreachable')
  })
})

describe('issue 3: directory listing tolerates unreachable symlinks', () => {
  it('lists a directory containing broken and looping symlinks', async () => {
    mkdirSync(path.join(realRoot, 'list-case'))
    writeFileSync(path.join(realRoot, 'list-case', 'normal.txt'), 'data')
    mkdirSync(path.join(realRoot, 'list-case', 'subdir'))
    symlinkSync(
      path.join(workspace, 'missing-list-target'),
      path.join(realRoot, 'list-case', 'broken-link')
    )
    symlinkSync(
      path.join(realRoot, 'list-case', 'loop-x'),
      path.join(realRoot, 'list-case', 'loop-y')
    )
    symlinkSync(
      path.join(realRoot, 'list-case', 'loop-y'),
      path.join(realRoot, 'list-case', 'loop-x')
    )
    writeFileSync(path.join(realRoot, 'list-case', 'target-file.txt'), 'data')
    symlinkSync(
      path.join(realRoot, 'list-case', 'target-file.txt'),
      path.join(realRoot, 'list-case', 'file-link')
    )
    mkdirSync(path.join(realRoot, 'list-case', 'target-dir'))
    symlinkSync(
      path.join(realRoot, 'list-case', 'target-dir'),
      path.join(realRoot, 'list-case', 'dir-link')
    )

    const result = await fileService.getFiles('list-case')

    assert.equal(result.error, null)
    const byName = new Map(result.files.map(file => [file.name, file]))
    assert.equal(result.files.length, 9)

    const normal = byName.get('normal.txt')
    assert.equal(normal?.isSymlink, false)
    assert.equal(normal?.targetExists, true)
    assert.equal(normal?.size, 4)

    const broken = byName.get('broken-link')
    assert.equal(broken?.isSymlink, true)
    assert.equal(broken?.targetExists, false)
    assert.equal(broken?.isDir, false)
    assert.ok((broken?.size ?? 0) > 0)
    assert.ok(broken?.mtime)

    const loop = byName.get('loop-x')
    assert.equal(loop?.isSymlink, true)
    assert.equal(loop?.targetExists, false)
    assert.equal(loop?.isDir, false)

    const fileLink = byName.get('file-link')
    assert.equal(fileLink?.isSymlink, true)
    assert.equal(fileLink?.targetExists, true)
    assert.equal(fileLink?.isDir, false)

    const dirLink = byName.get('dir-link')
    assert.equal(dirLink?.isSymlink, true)
    assert.equal(dirLink?.targetExists, true)
    assert.equal(dirLink?.isDir, true)

    const subdir = byName.get('subdir')
    assert.equal(subdir?.isDir, true)
    assert.equal(subdir?.isSymlink, false)
  })
})

describe('issue 4: children of a file-target symlink must be rejected', () => {
  before(() => {
    mkdirSync(path.join(realRoot, 'issue4'))
    writeFileSync(path.join(workspace, 'issue4-outside.txt'), 'outside')
    symlinkSync(
      path.join(workspace, 'issue4-outside.txt'),
      path.join(realRoot, 'issue4', 'file-link')
    )
    mkdirSync(path.join(workspace, 'issue4-target-dir'))
    symlinkSync(
      path.join(workspace, 'issue4-target-dir'),
      path.join(realRoot, 'issue4', 'dir-link')
    )
  })

  it('still allows accessing the file target itself through the link', async () => {
    const fullPath = await fileService.getFullPath('issue4/file-link')
    assert.equal(fullPath, path.join(workspace, 'issue4-outside.txt'))
  })

  it('rejects paths beneath a file-target symlink', async () => {
    const listing = await fileService.getFiles('issue4/file-link/child')
    assert.ok(listing.error?.includes('Expected a directory but found a file'))

    await assert.rejects(
      () => fileService.getFullPath('issue4/file-link/child'),
      (error: NodeJS.ErrnoException) => error.code === 'ENOTDIR'
    )

    const upload = await fileService.uploadFile('issue4/file-link/child', Buffer.from('x'))
    assert.equal(upload.success, false)
    assert.equal(upload.message, 'Expected a directory but found a file')
  })

  it('allows subpaths beneath a directory-target symlink', async () => {
    mkdirSync(path.join(workspace, 'issue4-target-dir', 'sub'))
    writeFileSync(path.join(workspace, 'issue4-target-dir', 'sub', 'inner.txt'), 'inner')

    const listing = await fileService.getFiles('issue4/dir-link/sub')
    assert.equal(listing.error, null)
    assert.equal(listing.files.length, 1)
    assert.equal(listing.files[0].name, 'inner.txt')

    const upload = await fileService.uploadFile('issue4/dir-link/uploaded.txt', Buffer.from('up'))
    assert.deepEqual(upload, { success: true })
    assert.equal(
      existsSync(path.join(workspace, 'issue4-target-dir', 'uploaded.txt')),
      true
    )
  })
})

describe('issue 5: symlinked config root accepts lexical absolute paths', () => {
  it('resolves absolute paths beneath the lexical config root', async () => {
    writeFileSync(path.join(realRoot, 'issue5.txt'), 'data')
    const absolutePath = path.join(lexicalRoot, 'issue5.txt')

    const resolved = await fileService.resolveAria2TaskPath(absolutePath, null)
    assert.equal(resolved, absolutePath)
  })

  it('still rejects absolute paths outside every configured root', async () => {
    const outsidePath = path.join(workspace, 'issue5-outside', 'file.txt')

    await assert.rejects(
      () => fileService.resolveAria2TaskPath(outsidePath, null),
      /outside download directory/
    )
  })
})

describe('issue 7: aria2 directory prefix mapping requires a separator boundary', () => {
  it('maps paths inside the aria2 download directory', async () => {
    mkdirSync(path.join(realRoot, 'issue7'))
    const resolved = await fileService.resolveAria2TaskPath('/downloads/issue7', '/downloads')
    assert.equal(resolved, path.join(lexicalRoot, 'issue7'))
  })

  it('maps an exact directory match to the host root', async () => {
    const resolved = await fileService.resolveAria2TaskPath('/downloads', '/downloads')
    assert.equal(resolved, lexicalRoot)
  })

  it('does not treat a sibling directory as part of the prefix', async () => {
    await assert.rejects(
      () => fileService.resolveAria2TaskPath('/downloads2/file.txt', '/downloads'),
      /outside download directory/
    )
  })

  it('supports prefixes configured with a trailing separator', async () => {
    mkdirSync(path.join(realRoot, 'issue7-trailing'))
    const resolved = await fileService.resolveAria2TaskPath('/downloads/issue7-trailing', '/downloads/')
    assert.equal(resolved, path.join(lexicalRoot, 'issue7-trailing'))
  })
})

describe('issue 8: relative path validation rejects drive-letter segments', () => {
  it('rejects drive-letter style segments in any position', () => {
    assert.equal(normalizeRelativePath('foo/C:/bar'), null)
    assert.equal(normalizeRelativePath('foo/C:'), null)
    assert.equal(normalizeRelativePath('C:/bar'), null)
    assert.equal(normalizeRelativePath('C:'), null)
  })

  it('keeps rejecting traversal, separators and control characters', () => {
    assert.equal(normalizeRelativePath('../escape'), null)
    assert.equal(normalizeRelativePath('a/./b'), null)
    assert.equal(normalizeRelativePath('a//b'), null)
    assert.equal(normalizeRelativePath('a\\b'), null)
    assert.equal(normalizeRelativePath('a\nb'), null)
  })

  it('still allows colons inside ordinary file names', () => {
    assert.equal(normalizeRelativePath('foo:bar'), 'foo:bar')
    assert.equal(normalizeRelativePath('dir/file:name.txt'), 'dir/file:name.txt')
  })
})

describe('issue 2: operations reuse the validated real path', () => {
  before(() => {
    mkdirSync(path.join(realRoot, 'issue2'))
    mkdirSync(path.join(workspace, 'issue2-target'))
    symlinkSync(path.join(workspace, 'issue2-target'), path.join(realRoot, 'issue2', 'dir-link'))
    writeFileSync(path.join(workspace, 'issue2-target', 'inside.txt'), 'inside')
  })

  it('resolves downloads through directory links to the real target', async () => {
    const fullPath = await fileService.getFullPath('issue2/dir-link/inside.txt')
    assert.equal(fullPath, path.join(workspace, 'issue2-target', 'inside.txt'))
  })

  it('renames entries inside a linked directory within its target', async () => {
    const result = await fileService.renameFile(
      'issue2/dir-link/inside.txt',
      'issue2/dir-link/renamed.txt'
    )
    assert.deepEqual(result, { success: true })
    assert.equal(existsSync(path.join(workspace, 'issue2-target', 'renamed.txt')), true)
    assert.equal(existsSync(path.join(workspace, 'issue2-target', 'inside.txt')), false)
  })

  it('renames a symlink itself without touching its target', async () => {
    const result = await fileService.renameFile('issue2/dir-link', 'issue2/dir-link-renamed')
    assert.deepEqual(result, { success: true })
    assert.equal(
      lstatSync(path.join(realRoot, 'issue2', 'dir-link-renamed')).isSymbolicLink(),
      true
    )
    assert.equal(existsSync(path.join(workspace, 'issue2-target', 'renamed.txt')), true)
  })

  it('deletes directories after revalidating the real path', async () => {
    mkdirSync(path.join(realRoot, 'issue2', 'doomed'))
    writeFileSync(path.join(realRoot, 'issue2', 'doomed', 'file.txt'), 'data')

    const result = await fileService.deleteFile('issue2/doomed')
    assert.deepEqual(result, { success: true })
    assert.equal(existsSync(path.join(realRoot, 'issue2', 'doomed')), false)
  })
})

describe('review fixes: deletion, root boundaries and nested links', () => {
  before(() => {
    mkdirSync(path.join(realRoot, 'review'))
    mkdirSync(path.join(workspace, 'review-target'))
    symlinkSync(path.join(workspace, 'review-target'), path.join(realRoot, 'review', 'link'))
    mkdirSync(path.join(workspace, 'review-target', 'sub'))
    writeFileSync(path.join(workspace, 'review-target', 'sub', 'inner.txt'), 'inner')
    writeFileSync(path.join(workspace, 'review-target', 'keep.txt'), 'keep')
  })

  it('deletes target entries through a directory link', async () => {
    const result = await fileService.deleteFile('review/link/sub')

    assert.deepEqual(result, { success: true })
    assert.equal(existsSync(path.join(workspace, 'review-target', 'sub')), false)
    assert.equal(existsSync(path.join(workspace, 'review-target', 'keep.txt')), true)
    assert.equal(lstatSync(path.join(realRoot, 'review', 'link')).isSymbolicLink(), true)
  })

  it('deletes a valid link itself without removing its target', async () => {
    const result = await fileService.deleteFile('review/link')

    assert.deepEqual(result, { success: true })
    assert.equal(existsSync(path.join(realRoot, 'review', 'link')), false)
    assert.equal(existsSync(path.join(workspace, 'review-target', 'keep.txt')), true)
  })

  it('refuses to recursively delete the configured root itself', async () => {
    const result = await fileService.deleteByAbsolutePath(lexicalRoot)

    assert.equal(result.success, false)
    assert.equal(result.message, 'Cannot delete the download root directory')
    assert.equal(existsSync(path.join(realRoot, 'review')), true)
  })

  it('resolves nested links segment by segment', async () => {
    mkdirSync(path.join(realRoot, 'nested'))
    mkdirSync(path.join(workspace, 'nested-a'))
    mkdirSync(path.join(workspace, 'nested-b'))
    symlinkSync(path.join(workspace, 'nested-a'), path.join(realRoot, 'nested', 'entry'))
    symlinkSync(path.join(workspace, 'nested-b'), path.join(workspace, 'nested-a', 'inner'))
    writeFileSync(path.join(workspace, 'nested-b', 'deep.txt'), 'deep')

    const listing = await fileService.getFiles('nested/entry/inner')
    assert.equal(listing.error, null)
    assert.deepEqual(listing.files.map(file => file.name), ['deep.txt'])

    const fullPath = await fileService.getFullPath('nested/entry/inner/deep.txt')
    assert.equal(fullPath, path.join(workspace, 'nested-b', 'deep.txt'))
  })

  it('supports symlinks targeting the filesystem root', async () => {
    mkdirSync(path.join(realRoot, 'root-link-case'))
    symlinkSync('/', path.join(realRoot, 'root-link-case', 'root-link'))
    writeFileSync(path.join(realRoot, 'root-marker.txt'), 'marker')

    const relative = 'root-link-case/root-link' + realRoot + '/root-marker.txt'
    const fullPath = await fileService.getFullPath(relative)
    assert.equal(fullPath, path.join(realRoot, 'root-marker.txt'))

    const listing = await fileService.getFiles('root-link-case/root-link' + realRoot)
    assert.equal(listing.error, null)
    assert.ok(listing.files.some(file => file.name === 'root-marker.txt'))
  })

  it('creates missing multi-level directories on upload', async () => {
    const result = await fileService.uploadFile(
      'review-fresh/a/b/c/file.txt',
      Buffer.from('fresh')
    )

    assert.deepEqual(result, { success: true })
    assert.equal(
      existsSync(path.join(realRoot, 'review-fresh', 'a', 'b', 'c', 'file.txt')),
      true
    )
  })

  it('rejects uploads beneath a regular file component', async () => {
    writeFileSync(path.join(realRoot, 'review-blocker.txt'), 'block')
    const result = await fileService.uploadFile('review-blocker.txt/child.txt', Buffer.from('x'))

    assert.equal(result.success, false)
    assert.equal(result.message, 'Expected a directory but found a file')
  })

  it('browses the root directory with an empty path', async () => {
    const listing = await fileService.getFiles('')
    assert.equal(listing.error, null)
    assert.ok(listing.files.some(file => file.name === 'review'))
  })

  it('allows both lexical and real absolute forms of the config root', async () => {
    writeFileSync(path.join(realRoot, 'dual-form.txt'), 'dual')

    const lexicalForm = await fileService.resolveAria2TaskPath(
      path.join(lexicalRoot, 'dual-form.txt'),
      null
    )
    assert.equal(lexicalForm, path.join(lexicalRoot, 'dual-form.txt'))

    const realForm = await fileService.resolveAria2TaskPath(
      path.join(realRoot, 'dual-form.txt'),
      null
    )
    assert.equal(realForm, path.join(realRoot, 'dual-form.txt'))
  })

  it('renaming onto an existing symlink replaces the link itself, not its target', async () => {
    mkdirSync(path.join(realRoot, 'rename-onto'))
    writeFileSync(path.join(workspace, 'rename-target.txt'), 'target-content')
    symlinkSync(
      path.join(workspace, 'rename-target.txt'),
      path.join(realRoot, 'rename-onto', 'dest-link')
    )
    writeFileSync(path.join(realRoot, 'rename-onto', 'src.txt'), 'src')

    const result = await fileService.renameFile('rename-onto/src.txt', 'rename-onto/dest-link')
    assert.deepEqual(result, { success: true })

    assert.equal(lstatSync(path.join(realRoot, 'rename-onto', 'dest-link')).isSymbolicLink(), false)
    assert.equal(existsSync(path.join(realRoot, 'rename-onto', 'src.txt')), false)
    assert.equal(
      readFileSync(path.join(workspace, 'rename-target.txt'), 'utf8'),
      'target-content'
    )
  })

  it('allows deleting a symlink whose target path crosses a regular file', async () => {
    writeFileSync(path.join(realRoot, 'enotdir-file.txt'), 'file')
    symlinkSync(
      path.join(realRoot, 'enotdir-file.txt', 'child'),
      path.join(realRoot, 'enotdir-link')
    )

    const result = await fileService.deleteFile('enotdir-link')
    assert.deepEqual(result, { success: true })
    assert.equal(existsSync(path.join(realRoot, 'enotdir-link')), false)
    assert.equal(existsSync(path.join(realRoot, 'enotdir-file.txt')), true)
  })

  it('normalizes edge-case relative paths consistently', () => {
    assert.equal(normalizeRelativePath(''), '')
    assert.equal(normalizeRelativePath('a/'), 'a')
    assert.equal(normalizeRelativePath('/a'), null)
    assert.equal(normalizeRelativePath('a/..'), null)
    assert.equal(normalizeRelativePath('a/b/..'), null)
  })
})
