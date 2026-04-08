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

  static build<B>(
    this: Constructor<B>,
    params?: BravoParams,
    query?: ModelQueryBuilderContract<LucidModel>
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
      items,
      total,
      filtered,
    }
  }

  public async aggregate() {
    await this.applyFilters()

    const dimensions: string[] = []
    if (Array.isArray(this.$params.dimensions)) {
      dimensions.push(...this.$params.dimensions)
    } else if (typeof this.$params.dimensions === 'string') {
      dimensions.push(this.$params.dimensions)
    }

    const metrics: string[] = []
    if (Array.isArray(this.$params.metrics)) {
      metrics.push(...this.$params.metrics)
    } else if (typeof this.$params.metrics === 'string') {
      metrics.push(this.$params.metrics)
    }

    if (dimensions.length === 0 || metrics.length === 0) {
      throw new Error('Dimensions and metrics are required for aggregation')
    }

    dimensions.forEach((dimension) => {
      const { expression, alias, rawExpression } = this.formatDimension(dimension)

      void this.$query.select(this.$query.client.raw(`${expression} as ${alias}`))

      if (rawExpression) {
        void this.$query.groupByRaw(expression)
      } else {
        void this.$query.groupBy(expression)
      }
    })

    metrics.forEach((metric) => {
      if (metric === 'count') {
        return void this.$query.count('* as total')
      }

      const [func, field] = metric.split(':')
      if (!func || !field) {
        throw new Error(`Invalid metric format: ${metric}`)
      }

      const alias = `${func}_${field}`
      void this.$query.select(this.$query.client.raw(`${func}(${field}) as ${alias}`))
    })

    const results = await this.$query.pojo()

    return results as Array<Record<string, string | number>>
  }

  private formatDimension(dimension: string) {
    const separatorIndex = dimension.lastIndexOf(':')
    const field = separatorIndex === -1 ? dimension : dimension.slice(0, separatorIndex)
    const period = separatorIndex === -1 ? undefined : dimension.slice(separatorIndex + 1)

    const { expression, rawExpression } = this.getDimensionExpression(field)
    const alias = this.buildDimensionAlias(field, period)

    if (!period) {
      return {
        expression,
        alias,
        rawExpression,
      }
    }

    const allowedPeriods = ['hour', 'day', 'month']
    if (!allowedPeriods.includes(period)) {
      throw new Error(`Unsupported dimension period: ${period}`)
    }

    return {
      expression: this.getDateDimensionExpression(expression, period),
      alias,
      rawExpression: true,
    }
  }

  private buildDimensionAlias(field: string, period?: string) {
    const normalizedField =
      field.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'dimension'

    if (!period) {
      return normalizedField
    }

    return `${normalizedField}_${period}`
  }

  private getDimensionExpression(field: string) {
    if (!field.includes('->')) {
      return {
        expression: field,
        rawExpression: false,
      }
    }

    const pathSegments = field
      .split('->')
      .map((segment) => segment.trim())
      .filter(Boolean)

    if (pathSegments.length < 2) {
      throw new Error(`Invalid JSON dimension format: ${field}`)
    }

    const baseField = pathSegments.shift() as string
    this.validateJsonPathSegments(pathSegments)

    const dialect = this.getDialect()

    if (dialect.includes('pg') || dialect.includes('postgres')) {
      let expression = baseField

      pathSegments.forEach((segment, index) => {
        const operator = index === pathSegments.length - 1 ? '->>' : '->'
        expression = `${expression}${operator}'${segment}'`
      })

      return {
        expression,
        rawExpression: true,
      }
    }

    const jsonPath = pathSegments.join('.')

    return {
      expression: `json_extract(${baseField}, '$.${jsonPath}')`,
      rawExpression: true,
    }
  }

  private validateJsonPathSegments(pathSegments: string[]) {
    for (const segment of pathSegments) {
      if (!/^[a-zA-Z0-9_]+$/.test(segment)) {
        throw new Error(`Invalid JSON path segment: ${segment}`)
      }
    }
  }

  private getDateDimensionExpression(expression: string, period: string) {
    const dialect = this.getDialect()

    if (dialect.includes('sqlite')) {
      return this.getSqliteDateExpression(expression, period)
    }

    if (dialect.includes('mysql')) {
      return this.getMysqlDateExpression(expression, period)
    }

    if (dialect.includes('pg') || dialect.includes('postgres')) {
      return this.getPostgresDateExpression(expression, period)
    }

    return `date_trunc('${period}', (${expression})::timestamp)`
  }

  private getSqliteDateExpression(expression: string, period: string) {
    const formats: Record<string, string> = {
      hour: '%Y-%m-%d %H:00',
      day: '%Y-%m-%d',
      month: '%Y-%m',
    }

    return `strftime('${formats[period]}', ${expression})`
  }

  private getMysqlDateExpression(expression: string, period: string) {
    const formats: Record<string, string> = {
      hour: '%Y-%m-%d %H:00',
      day: '%Y-%m-%d',
      month: '%Y-%m',
    }

    return `date_format(${expression}, '${formats[period]}')`
  }

  private getPostgresDateExpression(expression: string, period: string) {
    const formats: Record<string, string> = {
      hour: 'YYYY-MM-DD HH24:00',
      day: 'YYYY-MM-DD',
      month: 'YYYY-MM',
    }

    return `to_char(date_trunc('${period}', (${expression})::timestamp), '${formats[period]}')`
  }

  private getDialect() {
    const client: any = this.$query.client
    const configClient = client?.config?.client
    if (configClient) {
      return String(configClient).toLowerCase()
    }

    const dialect = client?.dialect
    if (typeof dialect === 'string') {
      return String(dialect).toLowerCase()
    }

    if (typeof dialect === 'object' && dialect?.config?.client) {
      return String(dialect.config.client).toLowerCase()
    }

    if (typeof dialect === 'object' && dialect?.name) {
      return String(dialect.name).toLowerCase()
    }

    const constructorName = client?.constructor?.name
    if (constructorName) {
      return String(constructorName).toLowerCase()
    }

    return ''
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
    const includes: string[] = []

    if (Array.isArray(this.$params.include)) {
      includes.push(...this.$params.include)
    } else if (typeof this.$params.include === 'string') {
      includes.push(this.$params.include)
    }

    const camelCasedIncludes = includes.map((relation) => stringHelpers.camelCase(relation))

    const allowed = this.getAllowedIncludes()

    for (const relation of camelCasedIncludes) {
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
