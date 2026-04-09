import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.ts'

type PostMetadata = {
  published?: boolean
  tags?: string[]
  topic?: string
}

export default class Post extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare views: number

  @column()
  declare category: string

  @column({
    prepare: (value: PostMetadata) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value) as PostMetadata,
  })
  declare metadata: PostMetadata

  @column()
  declare userId: number | null

  @column.dateTime({
    columnName: 'created_at',
    autoCreate: true,
  })
  declare createdAt: any

  @belongsTo(() => User)
  declare public user: BelongsTo<typeof User>
}
