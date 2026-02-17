/**
 * API 通用类型定义
 */

// API 错误响应
export interface ApiErrorResponse {
  error: {
    code: number
    message: string
  }
}

// API 成功响应包装
export interface ApiSuccessResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

// 分页参数
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// 排序参数
export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 常用查询参数
export interface CommonQueryParams extends PaginationParams, SortParams {
  search?: string
}

// API 响应类型守卫
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ApiErrorResponse).error === 'object' &&
    (response as ApiErrorResponse).error !== null &&
    'code' in (response as ApiErrorResponse).error &&
    'message' in (response as ApiErrorResponse).error
  )
}
