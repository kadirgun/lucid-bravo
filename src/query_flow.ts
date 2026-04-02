import type {
  LucidModel,
  ModelAttributes,
  ModelQueryBuilderContract,
} from '@adonisjs/lucid/types/model'

import stringHelpers from '@adonisjs/core/helpers/string'
import type { FlowParams, SortOption } from './types.ts'
import { HttpContext } from '@adonisjs/core/http'
import type { Authenticator } from '@adonisjs/auth'
import type { GuardFactory } from '@adonisjs/auth/types'

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    auth: Authenticator<Record<string, GuardFactory>>
  }
}

export abstract class QueryFlow<T extends LucidModel> {
  protected $query: ModelQueryBuilderContract<T>
  protected $params: FlowParams
  protected $auth: Authenticator<Record<string, GuardFactory>>

  protected defaultLimit: number = 20
  protected defaultSort: SortOption | null = null

  constructor(query: ModelQueryBuilderContract<T>, params: FlowParams) {
    this.$query = query
    this.$params = params

    const ctx = HttpContext.getOrFail()
    if (!('auth' in ctx)) {
      throw new Error('QueryFlow requires auth to be registered in the HttpContext')
    }

    this.$auth = ctx.auth
  }

  /**
   * Return a whitelist of sortable columns
   */
  public getSortable(): (keyof ModelAttributes<InstanceType<LucidModel>> | {})[] {
    return []
  }

  /**
   * Main entry point to apply all filters, sorting and pagination
   */
  public async handle() {
    await this.applyFilters()
    await this.applySorting()
    await this.applyPagination()

    return this.$query
  }

  /**
   * Automatically call methods that match camelCase version of snake_case params
   */
  protected async applyFilters() {
    for (const [key, value] of Object.entries(this.$params)) {
      if (['page', 'limit', 'sort'].includes(key)) {
        continue
      }

      if (value === undefined || value === null || value === '') {
        continue
      }

      // Convert snake_case to camelCase
      const methodName = stringHelpers.camelCase(key)

      // Use reflect-metadata or simple check if method exists on this instance
      const method = (this as any)[methodName]
      if (typeof method === 'function') {
        method.call(this, value)
      }
    }
  }

  /**
   * Apply sorting based on sort[field] and sort[order] params
   */
  protected async applySorting() {
    const sort = this.$params.sort
    const sortable = this.getSortable()

    let field = sort?.field
    let order = sort?.order || 'asc'

    // If no sort param, check for defaultSort
    if (!field && this.defaultSort) {
      field = this.defaultSort.field
      order = this.defaultSort.order
    }

    if (field && sortable.includes(field)) {
      void this.$query.orderBy(field, order)
    }
  }

  /**
   * Apply simple limit and offset pagination
   */
  protected async applyPagination() {
    const limit = Number(this.$params.limit) || this.defaultLimit
    const page = Number(this.$params.page) || 1
    const offset = (page - 1) * limit

    if (limit > 0) {
      void this.$query.limit(limit).offset(offset)
    }
  }
}
