export type SortOrder = 'asc' | 'desc'

export interface BravoSortOption {
  field: string
  order: SortOrder
}

export interface BravoParams {
  page?: number
  limit?: number
  sort?: {
    field?: string
    order?: SortOrder
  }
  include?: string[]
  [key: string]: any
}
