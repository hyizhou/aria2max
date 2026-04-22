/**
 * Extract display name from a download task
 */
export function getTaskFileName(task: any): string {
  // For BT tasks, use the BT task name
  if (task.bittorrent?.info?.name) {
    return task.bittorrent.info.name
  }

  // For regular tasks, use the file path
  if (task.files && task.files.length > 0) {
    const path = task.files[0].path
    return path.split('/').pop() || path
  }

  return ''
}
