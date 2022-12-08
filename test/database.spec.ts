import { assert } from 'chai'
import pg from 'pg'
import { DATABASE_CONNECTION_STRING } from '../src/config.js'

describe('Database Configuration', () => {

  const client = new pg.Client(DATABASE_CONNECTION_STRING)

  before(async () => {
    await client.connect()
  })

  after(async () => {
    client.end()
  })

  it('has configuration', async () => {
    assert.exists(DATABASE_CONNECTION_STRING, 'Configuration key `DATABASE_CONNECTION_STRING` not set. Update your .env file as in the template.')
  })

  it('can connect', async () => {
    const rs = await client.query('select 1 as one')
    assert.deepEqual(rs.rows, [ { one: 1 } ])
  })
})
