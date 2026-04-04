import { LucidBravo } from '../../../src/lucid_bravo.ts'
import type { LucidBravoAttributes, LucidBravoRelations } from '../../../src/types.js'
import User from '../models/user.ts'

type ModelType = typeof User

export default class UserBravo extends LucidBravo<ModelType> {
  protected defaultLimit = 2
  protected defaultSort = { field: 'name', order: 'asc' as const }

  protected override getModel(): ModelType {
    return User
  }

  protected override getSortable(): LucidBravoAttributes<ModelType>[] {
    return ['id', 'name']
  }

  protected override getAllowedIncludes(): LucidBravoRelations<User>[] {
    return ['posts']
  }

  protected async name(value: string) {
    this.$query.where('name', value)
  }
}
