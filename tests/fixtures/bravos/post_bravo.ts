import { LucidBravo } from '../../../src/lucid_bravo.ts'
import Post from '../models/post.ts'
import type { LucidBravoAttributes, LucidBravoRelations } from '../../../src/types.js'

type ModelType = typeof Post

export default class PostBravo extends LucidBravo<ModelType> {
  protected $model = Post
  protected defaultLimit = 2

  public override getSortable(): LucidBravoAttributes<ModelType>[] {
    return ['id', 'title']
  }

  public override getAllowedIncludes(): LucidBravoRelations<Post>[] {
    return ['user']
  }
}
