import { LucidBravo } from '../../../src/lucid_bravo.ts'
import type Post from '../models/post.ts'

export default class PostBravo extends LucidBravo<typeof Post> {
  protected defaultLimit = 2

  public override getSortable(): string[] {
    return ['id', 'title']
  }

  public override getAllowedIncludes(): string[] {
    return ['user']
  }
}
