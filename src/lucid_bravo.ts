import type {
  LucidModel,
  ModelAttributes,
  ModelQueryBuilderContract,
} from '@adonisjs/lucid/types/model'

import stringHelpers from '@adonisjs/core/helpers/string'
import type { BravoParams, BravoSortOption } from './types.ts'
import { HttpContext } from '@adonisjs/core/http'

export abstract class LucidBravo<T extends LucidModel> {
  protected $query: ModelQueryBuilderContract<T>
  protected $params: BravoParams
  protected $http: HttpContext
  protected $countQuery: ModelQueryBuilderContract<T>

  protected defaultLimit: number = 20
  protected defaultSort: BravoSortOption | null = null

  constructor(query: ModelQueryBuilderContract<T>, params: BravoParams) {
    this.$query = query
    this.$countQuery = query.clone()
    this.$params = params
    this.$http = HttpContext.getOrFail()
  }

  static build<T extends LucidModel, B extends LucidBravo<T>>(
    this: { new (query: ModelQueryBuilderContract<T>, params: BravoParams): B },
    query: ModelQueryBuilderContract<T>,
    params: BravoParams
  ): B {
    return new this(query, params)
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

      const methodName = stringHelpers.camelCase(key)

      if (!(methodName in this)) continue

      const method = this[methodName as keyof this]
      if (typeof method !== 'function') {
        throw new Error(`Expected ${methodName} to be a method on ${this.constructor.name}`)
      }

      await method.call(this, value)
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
