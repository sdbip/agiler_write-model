import { assert } from 'chai'
import pg from 'pg'
import { DATABASE_CONNECTION_STRING } from '../../../src/config.js'
import { ItemType, Progress } from '../../../src/domain/enums.js'
import { Feature } from '../../../src/domain/feature.js'
import { EventProjection } from '../../../src/es/event-projection.js'

describe('Projection of Feature.new()', () => {

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

  it('Feature is added to db', async () => {
    const task = Feature.new('A feature')
    const events = task.unpublishedEvents.map(e => ({
      entity: task.id,
      ...e,
    }))

    await projection.sync(events)

    const result = await db.query('SELECT * FROM "items"')
    assert.deepEqual(result.rows[0], {
      id: task.id.id,
      parent_id: null,
      progress: Progress.NotStarted,
      title: 'A feature',
      type: ItemType.Feature,
    })
  })
})
