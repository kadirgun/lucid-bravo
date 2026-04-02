import { AceFactory } from '@adonisjs/core/factories'
import { test } from '@japa/runner'
import MakeBravo from '../../commands/make_bravo.ts'

test.group('make bravo', (group) => {
  group.each.teardown(async () => {
    delete process.env.ADONIS_ACE_CWD
  })

  test('should create a new bravo class', async ({ fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl)

    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeBravo, ['User'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/bravos/user_bravo.ts')
  })
})
