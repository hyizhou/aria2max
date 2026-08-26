import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  getFileNameInvalidReason,
  getRenamePathInvalidReason
} from '../src/shared/utils/fileName'

describe('getFileNameInvalidReason', () => {
  it('accepts ordinary, hidden, Unicode, and spaced names', () => {
    assert.equal(getFileNameInvalidReason('file.txt'), null)
    assert.equal(getFileNameInvalidReason('.hidden'), null)
    assert.equal(getFileNameInvalidReason('电影 [2026].mkv'), null)
    assert.equal(getFileNameInvalidReason('file name'), null)
  })

  it('rejects blank names', () => {
    assert.equal(getFileNameInvalidReason(''), 'empty')
    assert.equal(getFileNameInvalidReason('   '), 'empty')
    assert.equal(getFileNameInvalidReason('\t\n'), 'empty')
  })

  it('rejects path separators', () => {
    assert.equal(getFileNameInvalidReason('folder/file'), 'pathSeparator')
    assert.equal(getFileNameInvalidReason('folder\\file'), 'pathSeparator')
  })

  it('rejects control characters and relative components', () => {
    assert.equal(getFileNameInvalidReason('file\0.txt'), 'controlCharacter')
    assert.equal(getFileNameInvalidReason('file\n.txt'), 'controlCharacter')
    assert.equal(getFileNameInvalidReason('.'), 'relativeComponent')
    assert.equal(getFileNameInvalidReason('..'), 'relativeComponent')
  })
})

describe('getRenamePathInvalidReason', () => {
  it('accepts a renamed entry in the same directory', () => {
    assert.equal(getRenamePathInvalidReason('file.txt', 'new-name.txt'), null)
    assert.equal(
      getRenamePathInvalidReason('downloads/file.txt', 'downloads/new-name.txt'),
      null
    )
  })

  it('rejects invalid target names without falling back to basename behavior', () => {
    assert.equal(
      getRenamePathInvalidReason('downloads/file.txt', 'downloads/'),
      'empty'
    )
    assert.equal(
      getRenamePathInvalidReason('downloads/file.txt', 'downloads/bad/name'),
      'differentDirectory'
    )
    assert.equal(
      getRenamePathInvalidReason('downloads/file.txt', 'downloads/bad\\name'),
      'pathSeparator'
    )
  })

  it('rejects malformed parent paths and path traversal', () => {
    assert.equal(
      getRenamePathInvalidReason('downloads/file.txt', 'downloads//name'),
      'invalidParentPath'
    )
    assert.equal(
      getRenamePathInvalidReason('downloads/file.txt', 'downloads/./name'),
      'invalidParentPath'
    )
    assert.equal(
      getRenamePathInvalidReason('../file.txt', '../name'),
      'invalidParentPath'
    )
  })

  it('rejects malformed old paths before reaching the file service', () => {
    assert.equal(getRenamePathInvalidReason('..', 'new-name'), 'invalidParentPath')
    assert.equal(
      getRenamePathInvalidReason('bad\\name', 'new-name'),
      'invalidParentPath'
    )
  })

  it('rejects using rename as a move operation', () => {
    assert.equal(
      getRenamePathInvalidReason('downloads/file.txt', 'other/file.txt'),
      'differentDirectory'
    )
  })
})
