import { LucidBravo } from '../../../src/lucid_bravo.ts'
import Post from '../models/post.ts'

export default class PostBravo extends LucidBravo<typeof Post> {
  protected $model = Post
  protected defaultLimit = 2

  public override getSortable(): string[] {
    return ['id', 'title']
  }

  public override getAllowedIncludes(): string[] {
    return ['user']
  }
}
