import type { LucidModel, LucidRow, ModelAttributes } from '@adonisjs/lucid/types/model'
import type { ExtractModelRelations } from '@adonisjs/lucid/types/relations'

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
  dimensions?: string[]
  metrics?: string[]
  [key: string]: any
}

export type LucidBravoAttributes<T extends LucidModel> = keyof ModelAttributes<InstanceType<T>> | {}
export type LucidBravoRelations<T extends LucidRow> = ExtractModelRelations<T> | {}
