import { BaseCommand, args } from '@adonisjs/core/ace'
import { stubsRoot } from '../stubs/main.ts'

export default class MakeFlow extends BaseCommand {
  static commandName = 'make:flow'
  static description = 'Create a new QueryFlow class'

  @args.string({ description: 'Name of the flow class model' })
  declare name: string

  async run() {
    const codemods = await this.createCodemods()
    return codemods.makeUsingStub(stubsRoot, 'make/flows/main.stub', {
      entity: this.app.generators.createEntity(this.name),
    })
  }
}
