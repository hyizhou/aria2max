export type FileNameInvalidReason =
  | 'empty'
  | 'pathSeparator'
  | 'controlCharacter'
  | 'relativeComponent'

export type RenamePathInvalidReason =
  | FileNameInvalidReason
  | 'invalidParentPath'
  | 'differentDirectory'

export function getFileNameInvalidReason(fileName: string): FileNameInvalidReason | null {
  if (fileName.trim().length === 0) return 'empty'
  if (fileName.includes('/') || fileName.includes('\\')) return 'pathSeparator'
  if (/[\u0000-\u001f\u007f]/.test(fileName)) return 'controlCharacter'
  if (fileName === '.' || fileName === '..') return 'relativeComponent'
  return null
}

function getParentPath(pathValue: string): string | null {
  const lastSlash = pathValue.lastIndexOf('/')
  if (lastSlash === -1) return ''

  const parent = pathValue.slice(0, lastSlash)
  if (parent.includes('\\')) return null

  const segments = parent.split('/')
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
    return null
  }
  return segments.join('/')
}

export function getRenamePathInvalidReason(
  oldPath: string,
  newPath: string
): RenamePathInvalidReason | null {
  const oldName = oldPath.slice(oldPath.lastIndexOf('/') + 1)
  if (getFileNameInvalidReason(oldName)) return 'invalidParentPath'

  const newName = newPath.slice(newPath.lastIndexOf('/') + 1)
  const invalidNameReason = getFileNameInvalidReason(newName)
  if (invalidNameReason) return invalidNameReason

  const oldParent = getParentPath(oldPath)
  const newParent = getParentPath(newPath)
  if (oldParent === null || newParent === null) return 'invalidParentPath'
  if (oldParent !== newParent) return 'differentDirectory'
  return null
}
