export type SortOrder = 'asc' | 'desc'

export interface SortOption {
  field: string
  order: SortOrder
}

export interface FlowParams {
  page?: number
  limit?: number
  sort?: {
    field?: string
    order?: SortOrder
  }
  include?: string[]
  [key: string]: any
}
