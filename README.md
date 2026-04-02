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

Use the class in a controller or service with the query builder and request params:

```ts
const bravo = new UserBravo(User.query(), {
  sort: { field: 'name', order: 'asc' },
  include: ['posts'],
  limit: 20,
  page: 1,
  name: 'Alice',
})

const users = await bravo.apply()
const result = await bravo.paginate()
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
- If you want request validation, create a Vine schema in your app that matches the same query shape.

## Authorization

If you need authorization inside a Bravo method or a controller that uses the same HTTP context, you can access Bouncer from `this.$http`:

```ts
const { bouncer } = this.$http

await bouncer.authorize(viewPosts)
await bouncer.with(PostsPolicy).authorize('viewAny')
```

## License

MIT
