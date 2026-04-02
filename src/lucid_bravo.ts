import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import stringHelpers from '@adonisjs/core/helpers/string'
import type {
  BravoParams,
  BravoSortOption,
  LucidBravoRelations,
  LucidBravoAttributes,
} from './types.ts'
import { HttpContext } from '@adonisjs/core/http'
import type { Constructor } from '@adonisjs/core/types/common'

export abstract class LucidBravo<T extends LucidModel> {
  protected $model?: T
  protected $query!: ModelQueryBuilderContract<T>
  protected $params: BravoParams
  protected $http: HttpContext
  protected $countQuery!: ModelQueryBuilderContract<T>

  protected defaultLimit: number = 20
  protected defaultSort: BravoSortOption | null = null

  constructor(params?: BravoParams, query?: ModelQueryBuilderContract<T>) {
    this.$params = params || {}
    this.$http = HttpContext.getOrFail()

    if (query) {
      this.$model = query.model
      this.$query = query
      this.$countQuery = this.$query.clone()
    }
  }

  static build<T extends LucidModel, B extends LucidBravo<T>>(
    this: Constructor<B>,
    params?: BravoParams,
    query?: ModelQueryBuilderContract<T>
  ): B {
    return new this(params, query)
  }

  protected resolveQuery() {
    if (this.$query) {
      return this.$query
    }

    if (this.$model) {
      this.$query = this.$model.query()
      this.$countQuery = this.$query.clone()
      return this.$query
    }

    throw new Error('Either a query must be provided or $model must be set in the subclass')
  }

  /**
   * Return a whitelist of sortable columns
   */
  public getSortable(): LucidBravoAttributes<T>[] {
    return []
  }

  /**
   * Return a whitelist of allowed relations for preload include
   */
  public getAllowedIncludes(): LucidBravoRelations<InstanceType<T>>[] {
    return []
  }

  /**
   * Main entry point to apply all filters, includes, sorting and pagination
   */
  public async apply() {
    this.resolveQuery()
    await this.applyFilters()
    await this.applyIncludes()
    await this.applySorting()
    await this.applyPagination()

    return this.$query
  }

  public async count() {
    this.resolveQuery()

    const result = await this.$countQuery.count('* as total').firstOrFail()
    return Number(result.$extras.total)
  }

  public async paginate() {
    const items = await this.apply()
    const total = await this.count()

    return {
      items,
      total,
    }
  }

  /**
   * Automatically call methods that match camelCase version of snake_case params
   */
  protected async applyFilters() {
    this.resolveQuery()

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
   * Apply preload include relations based on allowlist
   */
  protected async applyIncludes() {
    const query = this.resolveQuery()
    const includes = this.$params.include

    if (!Array.isArray(includes) || includes.length === 0) {
      return
    }

    const allowed = this.getAllowedIncludes()

    for (const relation of includes) {
      if (!allowed.includes(relation)) {
        continue
      }

      void query.preload(relation as any)
    }
  }

  /**
   * Apply sorting based on sort[field] and sort[order] params
   */
  protected async applySorting() {
    const query = this.resolveQuery()
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
      void query.orderBy(field, order)
    }
  }

  /**
   * Apply simple limit and offset pagination
   */
  protected async applyPagination() {
    const query = this.resolveQuery()
    const limit = Number(this.$params.limit) || this.defaultLimit
    const page = Number(this.$params.page) || 1
    const offset = (page - 1) * limit

    if (limit > 0) {
      void query.limit(limit).offset(offset)
    }
  }
}
