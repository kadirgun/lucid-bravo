import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.ts'

export default class Post extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare views: number

  @column()
  declare category: string

  @column()
  declare userId: number | null

  @belongsTo(() => User)
  declare public user: BelongsTo<typeof User>
}
