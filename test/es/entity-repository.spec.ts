import { assert } from 'chai'
import { promises as fs } from 'fs'
import pg from 'pg'
import { DATABASE_CONNECTION_STRING } from '../../src/config.js'
import { CanonicalEntityId } from '../../src/es/canonical-entity-id.js'
import { EntityRepository } from '../../src/es/entity-repository.js'
import { EntityVersion } from '../../src/es/entity-version.js'
import { Entity, EventPublisher } from '../../src/es/event-publisher.js'
import { PublishedEvent } from '../../src/es/published-event.js'
import { UnpublishedEvent } from '../../src/es/unpublished-event.js'

describe(EntityRepository.name, () => {

  let db: pg.Client
  const entityRepository = new EntityRepository()
  const publisher = new EventPublisher()

  beforeEach(async () => {

    const schemaDDL = await fs.readFile('./src/es/schema.sql')

    db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()
    await db.query('DROP TABLE IF EXISTS "events"; DROP TABLE IF EXISTS "entities"')
    await db.query(schemaDDL.toString('utf-8'))
  })

  afterEach(async () => {
    db.end()
  })

  it('finds stored events', async () => {

    const entity: Entity = {
      id: new CanonicalEntityId('id', 'type'),
      version: EntityVersion.new,
      unpublishedEvents: [
        new UnpublishedEvent('event1', { test: 'value' }),
        new UnpublishedEvent('event2', { test: 'value' }),
      ],
    }
    await publisher.publishChanges(entity, 'test-setup')

    const history = await entityRepository.getHistoryFor(new CanonicalEntityId('id', 'type'))
    assert.deepEqual(history?.events[0], new PublishedEvent('event1', { test: 'value' }))
    assert.deepEqual(history?.events[1], new PublishedEvent('event2', { test: 'value' }))
  })

  it('includes entity information', async () => {

    await publisher.publish(
      new UnpublishedEvent('event1', { test: 'value' }),
      new CanonicalEntityId('id', 'type'),
      'test-setup')
    const history = await entityRepository.getHistoryFor(new CanonicalEntityId('id', 'type'))
    assert.deepEqual(history?.version, EntityVersion.of(0))
    assert.deepEqual(history?.id, new CanonicalEntityId('id', 'type'))
  })

  it('returns undefined if the entity does not exist', async () => {
    assert.notExists(await entityRepository.getHistoryFor(new CanonicalEntityId('id', 'type')))
  })

  it('returns undefined if the entity is of a different type', async () => {
    await publisher.publish(
      new UnpublishedEvent('event', { test: 'value' }),
      new CanonicalEntityId('id', 'other_type'),
      'test-setup')

    assert.notExists(await entityRepository.getHistoryFor(new CanonicalEntityId('id', 'type')))
  })
})
