import { assert } from '@japa/assert'
import { configure, processCLIArgs, run } from '@japa/runner'
import { fileSystem } from '@japa/file-system'
import { closeApp, createApp } from '../tests/helpers/app.ts'

processCLIArgs(process.argv.splice(2))

configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [assert(), fileSystem()],
  setup: [
    async () => {
      await createApp()
    },
  ],
  teardown: [
    async () => {
      await closeApp()
    },
  ],
})

run()
