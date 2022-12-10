import { assert } from 'chai'
import pg from 'pg'
import { DATABASE_CONNECTION_STRING } from '../../src/config.js'
import { ItemEvent, ItemType, Progress } from '../../src/domain/enums.js'
import { CanonicalEntityId } from '../../src/es/canonical-entity-id.js'
import { EventProjection } from '../../src/es/event-projection.js'

describe(EventProjection.name, () => {

  let db: pg.Client
  const projection = new EventProjection()

  beforeEach(async () => {
    db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()
    await db.query('DROP TABLE IF EXISTS "items"')
  })

  afterEach(async () => {
    await db.end()
  })

  it('creates the Items table', async () => {
    await projection.sync([])

    const result = await db.query('SELECT * FROM "items"')
    assert.equal(result.rowCount, 0)
  })

  it('adds row when it receives "Created" event', async () => {
    await projection.sync([
      {
        name: ItemEvent.Created,
        entity: new CanonicalEntityId('id', 'Item'),
        details: { title: 'Title', type: ItemType.Task },
      },
    ])

    const result = await db.query('SELECT * FROM "items"')
    assert.equal(result.rowCount, 1)
    assert.deepEqual(result.rows[0], {
      id: 'id',
      parent_id: null,
      progress: Progress.NotStarted,
      title: 'Title',
      type: ItemType.Task,
    })
  })
})
