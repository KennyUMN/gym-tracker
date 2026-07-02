import { initSchema } from './client'
import { SCHEMA_STATEMENTS } from './schema'

describe('initSchema', () => {
  it('executes every schema statement against the provided db handle', async () => {
    const execAsync = jest.fn().mockResolvedValue(undefined)
    await initSchema({ execAsync })

    expect(execAsync).toHaveBeenCalledTimes(SCHEMA_STATEMENTS.length)
    SCHEMA_STATEMENTS.forEach((statement, index) => {
      expect(execAsync).toHaveBeenNthCalledWith(index + 1, statement)
    })
  })
})
