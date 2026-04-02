import { LucidBravo } from '../../../src/lucid_bravo.ts'
import type { LucidBravoAttributes, LucidBravoRelations } from '../../../src/types.js'
import User from '../models/user.ts'

type ModelType = typeof User

export default class UserBravo extends LucidBravo<ModelType> {
  protected model = User
  protected defaultLimit = 2
  protected defaultSort = { field: 'name', order: 'asc' as const }

  public override getSortable(): LucidBravoAttributes<ModelType>[] {
    return ['id', 'name']
  }

  public override getAllowedIncludes(): LucidBravoRelations<User>[] {
    return ['posts']
  }

  public async name(value: string) {
    this.$query.where('name', value)
  }
}
