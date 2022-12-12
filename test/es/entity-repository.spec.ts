import { assert } from 'chai'
import { promises as fs } from 'fs'
import pg from 'pg'
import { DATABASE_CONNECTION_STRING } from '../../src/config.js'
import * as source from '../../src/es/source.js'

describe(source.EntityRepository.name, () => {

  let db: pg.Client
  const entityRepository = new source.EntityRepository()
  const publisher = new source.EventPublisher()

  beforeEach(async () => {

    const schemaDDL = await fs.readFile('./schema/es.sql')

    db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()
    await db.query('DROP TABLE IF EXISTS "events"; DROP TABLE IF EXISTS "entities"')
    await db.query(schemaDDL.toString('utf-8'))
  })

  afterEach(async () => {
    db.end()
  })

  it('finds stored events', async () => {

    const entity: source.Entity = {
      id: new source.CanonicalEntityId('id', 'type'),
      version: source.EntityVersion.new,
      unpublishedEvents: [
        new source.UnpublishedEvent('event1', { test: 'value' }),
        new source.UnpublishedEvent('event2', { test: 'value' }),
      ],
    }
    await publisher.publishChanges(entity, 'test-setup')

    const history = await entityRepository.getHistoryFor('id')
    assert.deepEqual(history?.events[0], new source.PublishedEvent('event1', { test: 'value' }))
    assert.deepEqual(history?.events[1], new source.PublishedEvent('event2', { test: 'value' }))
  })

  it('includes entity information', async () => {
    await publisher.publish(
      new source.UnpublishedEvent('event1', { test: 'value' }),
      new source.CanonicalEntityId('id', 'type'),
      'test-setup')
    const history = await entityRepository.getHistoryFor('id')
    assert.deepEqual(history?.version, source.EntityVersion.of(0))
    assert.equal(history?.type, 'type')
  })

  it('returns undefined if the entity does not exist', async () => {
    assert.notExists(await entityRepository.getHistoryFor('id'))
  })
})
