import { isApiError } from '../types/api'

export function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isApiError(error) && error.error.message) return error.error.message
  if (error instanceof Error && error.message) return error.message
  return fallbackMessage
}
