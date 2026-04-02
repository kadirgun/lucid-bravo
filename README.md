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
node ace make:bravo User
```

The command creates a file like `app/bravos/user_bravo.ts` with a ready-to-edit class that extends `LucidBravo`.

## Basic usage

Create a Bravo class for each model and define the allowed sort fields, preload relations, and model-specific filters. The generated scaffold already includes the base-class import, so the example below shows only the parts you normally customize.

```ts
export default class UserBravo extends LucidBravo<typeof User> {
  protected defaultLimit = 20
  protected defaultSort = { field: 'name', order: 'asc' as const }

  public override getSortable(): string[] {
    return ['id', 'name']
  }

  public override getAllowedIncludes(): string[] {
    return ['posts']
  }

  public async name(value: string) {
    this.$query.where('name', value)
  }
}
```

You can create a Bravo instance in a few different ways, depending on whether you already have a Lucid query builder or want Bravo to create one from the model declared in the subclass:

```ts
const bravoA = new UserBravo({
  limit: 20,
})

const bravoB = new UserBravo(
  {
    limit: 20,
  },
  User.query()
)

const bravoC = UserBravo.build(
  {
    limit: 20,
  },
  User.query()
)

// default query and params
const bravoD = UserBravo.build()
const bravoE = new UserBravo()
```

Use the class in a controller with `bravoValidator` to validate the common query params before passing them to Bravo:

```ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import UserBravo from '#bravos/user_bravo'
import { bravoValidator } from '@kadirgun/lucid-bravo/validators'

export default class UsersController {
  public async index({ request }: HttpContext) {
    const params = await request.validateUsing(bravoValidator)
    const bravo = new UserBravo(params, User.query())

    return bravo.paginate()
  }
}
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

## Authorization

If you need authorization inside a Bravo method or a controller that uses the same HTTP context, you can access Bouncer from `this.$http`:

```ts
const { bouncer } = this.$http

await bouncer.authorize(viewPosts)
await bouncer.with(PostsPolicy).authorize('viewAny')
```

## License

MIT
