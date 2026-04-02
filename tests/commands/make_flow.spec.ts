import { AceFactory } from '@adonisjs/core/factories'
import { test } from '@japa/runner'
import MakeFlow from '../../commands/make_flow.ts'

test.group('make flow', (group) => {
  group.each.teardown(async () => {
    delete process.env.ADONIS_ACE_CWD
  })

  test('should create a new flow class', async ({ fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl)

    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeFlow, ['User'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/flows/user_flow.ts')
  })
})
