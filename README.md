# Lucid Bravo

Lucid Bravo is a fluent query builder for AdonisJS Lucid models. It helps you keep filtering, sorting, relation preloading, and pagination in one place instead of spreading that logic across controllers.

## Installation

```bash
npm install @kadirgun/lucid-bravo
```

## Configure

Run the package configure command once in your AdonisJS app:

```bash
node ace configure @kadirgun/lucid-bravo
```

This registers the package command so you can generate new Bravo classes with the scaffold command.

## Generate a Bravo class

```bash
node ace make:bravo Post
```

The command creates a file like `app/bravos/post_bravo.ts` with a ready-to-edit class that extends `LucidBravo`.

## Basic usage

Create a Bravo class for each model and define the allowed sort fields, preload relations, and model-specific filters. The generated scaffold already includes the base-class import, so the example below shows only the parts you normally customize.

```ts
type ModelType = typeof Post

export default class PostBravo extends LucidBravo<ModelType> {
  protected model = Post
  protected defaultLimit = 10

  public override getSortable(): LucidBravoAttributes<ModelType>[] {
    return ['id', 'title']
  }

  public override getAllowedIncludes(): LucidBravoRelations<Post>[] {
    return ['labels']
  }

  public async title(value: string) {
    this.$query.where('title', 'like', `%${value}%`)
  }
}
```

Use the class in a controller with `bravoValidator` to validate the common query params before passing them to Bravo:

```ts
import type { HttpContext } from '@adonisjs/core/http'
import Post from '#models/post'
import PostBravo from '#bravos/post_bravo'
import { bravoValidator } from '@kadirgun/lucid-bravo/validators'

export default class PostController {
  public async index({ request }: HttpContext) {
    const params = await request.validateUsing(bravoValidator)

    return PostBravo.build(params).paginate()
  }
}
```

You can create a Bravo instance in a few different ways, depending on whether you already have a Lucid query builder or want Bravo to create one from the model declared in the subclass:

```ts
const bravoA = new PostBravo({
  limit: 20,
})

const bravoB = new PostBravo(
  {
    limit: 20,
  },
  Post.query()
)

const bravoC = PostBravo.build(
  {
    limit: 20,
  },
  Post.query()
)

// default query and params
const bravoD = PostBravo.build()
const bravoE = new PostBravo()
```

## Query params

Lucid Bravo understands these params out of the box:

- `sort.field` and `sort.order`
- `limit`
- `page`
- `include`
- any custom filter key that matches a camelCase method on your Bravo class

For example, `first_name` maps to a `firstName()` method.

## Notes

- `LucidBravo` expects to run inside an active HTTP context.
- Only relations returned by `getAllowedIncludes()` are preloaded.
- For the common query shape, you can reuse `bravoValidator` from `@kadirgun/lucid-bravo/validators`.
- If you also need model-specific filters, add a separate Vine schema in your app and merge the validated values before creating the Bravo instance.

## License

MIT
