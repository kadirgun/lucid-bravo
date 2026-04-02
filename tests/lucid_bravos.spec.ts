import { test } from '@japa/runner'

import Post from './fixtures/post.ts'
import PostBravo from './fixtures/post_bravo.ts'
import User from './fixtures/user.ts'
import UserBravo from './fixtures/user_bravo.ts'
import { withLucidHarness } from './fixtures/lucid.ts'

test.group('lucid bravos', () => {
  test('user bravo sorts and paginates users', async ({ assert }) => {
    await withLucidHarness(async ({ withHttpContext }) => {
      await User.createMany([{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }])

      const users = await withHttpContext(async () => {
        const bravo = new UserBravo(User.query(), {
          sort: {
            field: 'name',
            order: 'asc',
          },
          limit: 2,
        })

        return await bravo.handle()
      })

      assert.deepEqual(
        users.map((user) => user.name),
        ['Alice', 'Bob']
      )
    })
  })

  test('post bravo sorts and paginates posts', async ({ assert }) => {
    await withLucidHarness(async ({ withHttpContext }) => {
      await Post.createMany([
        { title: 'Gamma', userId: null },
        { title: 'Alpha', userId: null },
        { title: 'Beta', userId: null },
      ])

      const posts = await withHttpContext(async () => {
        const bravo = new PostBravo(Post.query(), {
          page: 2,
          sort: {
            field: 'title',
            order: 'asc',
          },
          limit: 1,
        })

        return await bravo.handle()
      })

      assert.lengthOf(posts, 1)
      assert.equal(posts[0].title, 'Beta')
    })
  })
})
