import { LucidBravo } from '../../src/lucid_bravo.ts'
import type User from './user.ts'

export default class UserBravo extends LucidBravo<typeof User> {
  protected defaultLimit = 2
  protected defaultSort = { field: 'name', order: 'asc' as const }

  public override getSortable(): string[] {
    return ['id', 'name']
  }

  public async name(value: string) {
    this.$query.where('name', value)
  }
}
