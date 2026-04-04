import { LucidBravo } from '../../../src/lucid_bravo.ts'
import type { LucidBravoAttributes, LucidBravoRelations } from '../../../src/types.js'
import Post from '../models/post.ts'

type ModelType = typeof Post

export default class PostBravo extends LucidBravo<ModelType> {
  protected defaultLimit = 10

  protected getModel(): ModelType {
    return Post
  }

  protected override getSortable(): LucidBravoAttributes<ModelType>[] {
    return ['id', 'title']
  }

  protected override getAllowedIncludes(): LucidBravoRelations<Post>[] {
    return ['user']
  }

  protected async title(value: string) {
    this.$query.where('title', 'like', `%${value}%`)
  }
}
