import { createApp, resetDatabase, withAppContext } from '../helpers/app.ts'

type LucidHarness = {
  withHttpContext<Result>(handler: () => Promise<Result> | Result): Promise<Result>
}

export async function withLucidHarness<Result>(
  callback: (harness: LucidHarness) => Promise<Result>
): Promise<Result> {
  await createApp()
  await resetDatabase()

  return callback({
    withHttpContext: withAppContext,
  })
}
