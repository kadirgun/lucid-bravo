import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { IgnitorFactory } from '@adonisjs/core/factories'
import { HttpContext } from '@adonisjs/core/http'
import { defineConfig } from '@adonisjs/lucid'
import { FileSystem } from '@japa/file-system'

type TestApp = {
  fs: FileSystem
  database: any
  ignitor: {
    terminate(): Promise<void>
  }
}

let appPromise: Promise<TestApp> | null = null

function createAuthStub() {
  const auth: any = {}
  auth.defaultGuard = 'web'
  auth.user = null
  auth.isAuthenticated = false
  auth.use = () => auth
  auth.getUserOrFail = () => auth.user

  return auth
}

async function createTempFileSystem() {
  const basePath = await mkdtemp(join(tmpdir(), 'lucid-bravo-'))
  return new FileSystem(basePath)
}

async function bootstrapApp(): Promise<TestApp> {
  const fs = await createTempFileSystem()

  await fs.create(
    'config/database.ts',
    `import { defineConfig } from '@adonisjs/lucid'

export default defineConfig({
  connection: 'sqlite',
  connections: {
    sqlite: {
      client: 'better-sqlite3',
      connection: {
        filename: ':memory:',
      },
      useNullAsDefault: true,
    },
  },
})`
  )

  const ignitor = new IgnitorFactory()
    .withCoreConfig()
    .withCoreProviders()
    .merge({
      rcFileContents: {
        providers: [() => import('@adonisjs/lucid/database_provider')],
      },
      config: {
        database: defineConfig({
          connection: 'sqlite',
          connections: {
            sqlite: {
              client: 'better-sqlite3',
              connection: {
                filename: ':memory:',
              },
              useNullAsDefault: true,
            },
          },
        }),
      },
    })
    .create(fs.baseUrl, {
      importer: (filePath) => import(filePath),
    })

  const app = ignitor.createApp('web')
  await app.init()
  await app.boot()

  const database = await app.container.make('lucid.db')
  await database.connection().schema.createTable('users', (table: any) => {
    table.increments('id')
    table.string('name').notNullable()
  })

  await database.connection().schema.createTable('posts', (table: any) => {
    table.increments('id')
    table.string('title').notNullable()
    table.integer('user_id').nullable()
    table.integer('views').notNullable().defaultTo(0)
    table.string('category').notNullable().defaultTo('uncategorized')
    table.text('metadata').nullable()
    table.datetime('created_at').notNullable().defaultTo(database.raw('CURRENT_TIMESTAMP'))
  })

  return {
    fs,
    database,
    ignitor,
  }
}

export async function createApp() {
  if (!appPromise) {
    appPromise = bootstrapApp()
  }

  return appPromise
}

export async function closeApp() {
  if (!appPromise) {
    return
  }

  const { fs, ignitor } = await appPromise
  appPromise = null

  await ignitor.terminate()
  await fs.cleanup({ recursive: true, force: true })
}

export async function resetDatabase() {
  const { database } = await createApp()

  await database.connection().from('posts').delete()
  await database.connection().from('users').delete()
}

export async function withAppContext<T>(callback: () => Promise<T> | T): Promise<T> {
  const originalGetOrFail = (HttpContext as any).getOrFail
  const context = {
    auth: createAuthStub(),
  }

  ;(HttpContext as any).getOrFail = () => context

  try {
    return await callback()
  } finally {
    ;(HttpContext as any).getOrFail = originalGetOrFail
  }
}
