import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import stringHelpers from '@adonisjs/core/helpers/string'
import { HttpContext } from '@adonisjs/core/http'
import type { Constructor } from '@adonisjs/core/types/common'
import type {
  BravoParams,
  BravoSortOption,
  LucidBravoAttributes,
  LucidBravoRelations,
} from './types.ts'

export abstract class LucidBravo<T extends LucidModel> {
  private model: T
  protected $query!: ModelQueryBuilderContract<T>
  protected $params: BravoParams
  protected $http: HttpContext
  protected $countQuery!: ModelQueryBuilderContract<T>
  protected $filteredQuery!: ModelQueryBuilderContract<T>
  private applied = false

  protected defaultLimit: number = 20
  protected defaultSort: BravoSortOption | null = null

  constructor(params?: BravoParams, query?: ModelQueryBuilderContract<T>) {
    this.$params = params || {}
    this.$http = HttpContext.getOrFail()

    if (query) {
      this.$query = query
    } else {
      this.$query = this.getModel().query()
    }

    this.model = this.$query.model
    this.$countQuery = this.$query.clone()
  }

  static build<T extends LucidModel, B extends LucidBravo<T>>(
    this: Constructor<B>,
    params?: BravoParams,
    query?: ModelQueryBuilderContract<T>
  ): B {
    return new this(params, query)
  }

  /**
   * Return a whitelist of sortable columns
   */
  protected getSortable(): LucidBravoAttributes<T>[] {
    return []
  }

  /**
   * Return a whitelist of allowed relations for preload include
   */
  protected getAllowedIncludes(): LucidBravoRelations<InstanceType<T>>[] {
    return []
  }

  protected getModel(): T {
    if (this.model) return this.model
    throw new Error('Model not defined')
  }

  // @ts-ignore
  protected transform(items: InstanceType<T>[]) {
    return items
  }

  /**
   * Main entry point to apply all filters, includes, sorting and pagination
   */
  public async apply() {
    if (this.applied) return this.$query
    await this.applyFilters()
    await this.applyIncludes()
    await this.applySorting()
    await this.applyPagination()

    this.applied = true

    return this.$query
  }

  private async count(query: ModelQueryBuilderContract<T>): Promise<number> {
    const result = await query.count('* as total').firstOrFail()
    return Number(result.$extras.total)
  }

  public async paginate() {
    const items = await this.apply()
    const total = await this.count(this.$countQuery)
    const filtered = await this.count(this.$filteredQuery)

    return {
      items: this.transform(items),
      total,
      filtered,
    }
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

    this.$filteredQuery = this.$query.clone()
  }

  /**
   * Apply preload include relations based on allowlist
   */
  protected async applyIncludes() {
    const includes = this.$params.include

    if (!Array.isArray(includes) || includes.length === 0) {
      return
    }

    const allowed = this.getAllowedIncludes()

    for (const relation of includes) {
      if (!allowed.includes(relation)) {
        continue
      }

      void this.$query.preload(relation as any)
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

  protected async applyPagination() {
    const limit = Number(this.$params.limit) || this.defaultLimit
    const page = Number(this.$params.page) || 1
    const offset = (page - 1) * limit

    if (limit > 0) {
      void this.$query.limit(limit).offset(offset)
    }
  }
}
