/**
 * Extract error message from API error objects
 */
export function extractErrorMessage(error: any): string {
  if (!error) return ''
  if (error.error?.message) return error.error.message
  if (error.message) return error.message
  return ''
}
