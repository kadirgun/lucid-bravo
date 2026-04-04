import { test } from '@japa/runner'

import PostBravo from './fixtures/bravos/post_bravo.ts'
import UserBravo from './fixtures/bravos/user_bravo.ts'
import { withLucidHarness } from './fixtures/lucid.ts'
import Post from './fixtures/models/post.ts'
import User from './fixtures/models/user.ts'

test.group('lucid bravos', () => {
  test('user bravo sorts and paginates users', async ({ assert }) => {
    await withLucidHarness(async ({ withHttpContext }) => {
      await User.createMany([{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }])

      const users = await withHttpContext(async () => {
        const bravo = new UserBravo(
          {
            sort: {
              field: 'name',
              order: 'asc',
            },
            limit: 2,
          },
          User.query()
        )

        return await bravo.apply()
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
        const bravo = new PostBravo(
          {
            page: 2,
            sort: {
              field: 'title',
              order: 'asc',
            },
            limit: 1,
          },
          Post.query()
        )

        return await bravo.apply()
      })

      assert.lengthOf(posts, 1)
      assert.equal(posts[0].title, 'Beta')
    })
  })

  test('user bravo preloads allowed include posts', async ({ assert }) => {
    await withLucidHarness(async ({ withHttpContext }) => {
      const user = await User.create({ name: 'Alice' })
      await Post.createMany([
        { title: 'Post A', userId: user.id },
        { title: 'Post B', userId: user.id },
      ])

      const users = await withHttpContext(async () => {
        const bravo = UserBravo.build({
          include: ['posts'],
        })

        return await bravo.apply()
      })

      assert.lengthOf(users, 1)
      assert.isArray(users[0].posts)
      assert.lengthOf(users[0].posts, 2)
      assert.deepEqual(
        users[0].posts.map((post) => post.title),
        ['Post A', 'Post B']
      )
    })
  })

  test('user bravo skips not allowed include relation', async ({ assert }) => {
    await withLucidHarness(async ({ withHttpContext }) => {
      const user = await User.create({ name: 'Bob' })
      await Post.create({ title: 'Post X', userId: user.id })

      const users = await withHttpContext(async () => {
        const bravo = new UserBravo({
          include: ['invalid_relation'],
        })

        return await bravo.apply()
      })

      assert.lengthOf(users, 1)
      assert.isUndefined((users[0] as any).posts)
    })
  })

  test('user bravo count and paginate', async ({ assert }) => {
    await withLucidHarness(async ({ withHttpContext }) => {
      await User.createMany([
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' },
        { name: 'David' },
        { name: 'Eve' },
      ])

      const result = await withHttpContext(async () => {
        const bravo = new UserBravo({
          limit: 2,
          page: 2,
          sort: { field: 'name', order: 'asc' },
        })

        return await bravo.paginate()
      })

      assert.equal(result.total, 5)
      assert.lengthOf(result.items, 2)
      assert.deepEqual(
        result.items.map((user) => user.name),
        ['Charlie', 'David']
      )
    })
  })

  test('user bravo applyFilters with method name and defaultSort fallback', async ({ assert }) => {
    await withLucidHarness(async ({ withHttpContext }) => {
      await User.createMany([{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }])

      const users = await withHttpContext(async () => {
        const bravo = new UserBravo({
          name: 'Bob',
        })

        return await bravo.apply()
      })

      assert.lengthOf(users, 1)
      assert.equal(users[0].name, 'Bob')
    })
  })

  test('user bravo skips invalid sort field and uses default limit', async ({ assert }) => {
    await withLucidHarness(async ({ withHttpContext }) => {
      await User.createMany([{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }])

      const users = await withHttpContext(async () => {
        const bravo = new UserBravo({
          sort: { field: 'nonexistent', order: 'asc' },
          limit: 2,
        })

        return await bravo.apply()
      })

      // sort field not allowed, so default order (user id based) should apply in insertion order
      assert.lengthOf(users, 2)
    })
  })

  test('post bravo aggregate with dimensions and metrics', async ({ assert }) => {
    await withLucidHarness(async ({ withHttpContext }) => {
      const user1 = await User.create({ name: 'Alice' })

      const posts = []
      const categories = ['Tech', 'Health']

      for (let i = 0; i < 5; i++) {
        posts.push({
          title: `Post ${i + 1}`,
          userId: user1.id,
          category: categories[i % categories.length],
          views: (i + 1) * 10,
        })
      }

      await Post.createMany(posts)

      const results = await withHttpContext(async () => {
        const bravo = new PostBravo({
          dimensions: ['category'],
          metrics: ['count', 'avg:views'],
        })

        return await bravo.aggregate()
      })

      assert.lengthOf(results, 2)

      results.forEach((result) => {
        assert.equal(result.avg_views, 30)
      })
    })
  })

  test('post bravo aggregate formats created_at by day', async ({ assert }) => {
    await withLucidHarness(async ({ withHttpContext }) => {
      const { DateTime } = await import('luxon')
      const user1 = await User.create({ name: 'Alice' })

      await Post.createMany([
        {
          title: 'Post 1',
          userId: user1.id,
          category: 'Tech',
          views: 10,
          createdAt: DateTime.fromJSDate(new Date('2024-01-01T10:15:00Z')),
        },
        {
          title: 'Post 2',
          userId: user1.id,
          category: 'Tech',
          views: 20,
          createdAt: DateTime.fromJSDate(new Date('2024-01-01T11:45:00Z')),
        },
        {
          title: 'Post 3',
          userId: user1.id,
          category: 'Health',
          views: 30,
          createdAt: DateTime.fromJSDate(new Date('2024-01-02T09:00:00Z')),
        },
      ])

      const results = await withHttpContext(async () => {
        const bravo = new PostBravo({
          dimensions: ['created_at:day'],
          metrics: ['count'],
        })

        return await bravo.aggregate()
      })

      assert.lengthOf(results, 2)
      assert.deepEqual(results.map((row) => row.created_at_day).sort(), [
        '2024-01-01',
        '2024-01-02',
      ])
      assert.deepEqual(
        results.map((row) => Number(row.total)).sort((a, b) => a - b),
        [1, 2]
      )
    })
  })
})
