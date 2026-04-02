import { BaseCommand, args } from '@adonisjs/core/ace'
import { stubsRoot } from '../stubs/main.ts'

export default class MakeBravo extends BaseCommand {
  static commandName = 'make:bravo'
  static description = 'Create a new Bravo class for a given model'

  @args.string({ description: 'Name of the bravo class model' })
  declare name: string

  async run() {
    const codemods = await this.createCodemods()
    return codemods.makeUsingStub(stubsRoot, 'make/bravos/main.stub', {
      entity: this.app.generators.createEntity(this.name),
    })
  }
}
