import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Post from './post.ts'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @hasMany(() => Post)
  declare public posts: HasMany<typeof Post>
}
