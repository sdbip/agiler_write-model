import { assert } from 'chai'
import pg from 'pg'
import { DATABASE_CONNECTION_STRING } from '../../src/config.js'
import { CanonicalEntityId } from '../../src/es/canonical-entity-id.js'
import { EntityVersion } from '../../src/es/entity-version.js'
import { EventPublisher } from '../../src/es/event-publisher.js'
import { UnpublishedEvent } from '../../src/es/unpublished-event.js'

describe(EventPublisher.name, () => {

  let db: pg.Client
  const publisher = new EventPublisher()

  beforeEach(async () => {
    db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()
    await db.query('DROP TABLE IF EXISTS "events"')
    await db.query('DROP TABLE IF EXISTS "entities"')
  })

  afterEach(async () => {
    await db.end()
  })

  describe('publish(single event)', () => {

    it('creates entity if it does not exist', async () => {
      const entity = new CanonicalEntityId('entity', 'type')
      const event = new UnpublishedEvent('event', { value: 1 })
      await publisher.publish(event, entity, 'test-system')

      const rs = await db.query('SELECT * FROM "entities"')
      assert.lengthOf(rs.rows, 1)
      assert.deepEqual(rs.rows[0], {
        id: 'entity',
        type: 'type',
        version: 0,
      })
    })

    it('does not create entity twice', async () => {
      const entity = new CanonicalEntityId('entity', 'type')
      const event = new UnpublishedEvent('event', { value: 1 })
      await publisher.publish(event, entity, 'test-system')
      await publisher.publish(event, entity, 'test-system')

      const rs = await db.query('SELECT * FROM "entities"')
      assert.lengthOf(rs.rows, 1)
    })

    it('publishes the event', async () => {
      const entity = new CanonicalEntityId('entity', 'type')
      const event = new UnpublishedEvent('event', { value: 1 })
      await publisher.publish(event, entity, 'test-system')

      const rs = await db.query('SELECT * FROM "events"')
      assert.lengthOf(rs.rows, 1)
      assert.deepEqual({ ...rs.rows[0], timestamp: undefined }, {
        name: 'event',
        details: '{"value":1}',

        entity_id: 'entity',
        entity_type: 'type',

        version: 0,
        position: '0',

        actor: 'test-system',
        timestamp: undefined,
      })
    })

    it('assigns positioning information to events', async () => {
      const entity = new CanonicalEntityId('entity', 'type')
      await publisher.publish(new UnpublishedEvent('event1', {}), entity, 'test-system')
      await publisher.publish(new UnpublishedEvent('event2', {}), entity, 'test-system')

      const rs = await db.query('SELECT * FROM "events" ORDER BY "version"')
      assert.lengthOf(rs.rows, 2)
      assert.equal(rs.rows[1].version, 1)
      assert.equal(rs.rows[1].position, 1)
    })
  })

  describe('publishChanges(entity)', () => {

    it('creates entity if it does not exist', async () => {
      const entity = {
        id: new CanonicalEntityId('entity', 'type'),
        version: EntityVersion.new,
        unpublishedEvents: [],
      }
      await publisher.publishChanges(entity, 'test.system')

      const rs = await db.query('SELECT * FROM "entities"')
      assert.lengthOf(rs.rows, 1)
      assert.deepEqual(rs.rows[0], {
        id: 'entity',
        type: 'type',
        version: 0,
      })
    })

    it('does not create entity twice', async () => {
      await publisher.publishChanges({
        id: new CanonicalEntityId('entity', 'type'),
        version: EntityVersion.new,
        unpublishedEvents: [],
      }, 'test.system')
      await publisher.publishChanges({
        id: new CanonicalEntityId('entity', 'type'),
        version: EntityVersion.of(0),
        unpublishedEvents: [],
      }, 'test.system')

      const rs = await db.query('SELECT * FROM "entities"')
      assert.lengthOf(rs.rows, 1)
      assert.deepEqual(rs.rows[0], {
        id: 'entity',
        type: 'type',
        version: 0,
      })
    })

    it('publishes events', async () => {
      const entity = {
        id: new CanonicalEntityId('entity', 'type'),
        version: EntityVersion.new,
        unpublishedEvents: [
          new UnpublishedEvent('event1', { value: 1 }),
          new UnpublishedEvent('event2', {}),
        ],
      }
      await publisher.publishChanges(entity, 'test-system')

      const rs = await db.query('SELECT * FROM "events"')
      assert.lengthOf(rs.rows, 2)
      assert.deepEqual({ ...rs.rows[0], timestamp: undefined }, {
        name: 'event1',
        details: '{"value":1}',

        entity_id: 'entity',
        entity_type: 'type',

        version: 0,
        position: '0',

        actor: 'test-system',
        timestamp: undefined,
      })
      assert.deepEqual({ ...rs.rows[1], timestamp: undefined }, {
        name: 'event2',
        details: '{}',

        entity_id: 'entity',
        entity_type: 'type',

        version: 1,
        position: '0',

        actor: 'test-system',
        timestamp: undefined,
      })
    })

    it('does not publish if entity has already changed', async () => {

      const entity = {
        id: new CanonicalEntityId('entity', 'type'),
        unpublishedEvents: [],
        version: EntityVersion.new,
      }

      const event = new UnpublishedEvent('event', { value: 1 })
      await publisher.publish(event, entity.id, 'test-system')

      let caught: unknown
      try {
        await publisher.publishChanges(entity, 'test.system')
      } catch (error) {
        caught = error
      }

      assert.exists(caught, 'publishChanges should have thrown error')

      const rs = await db.query('SELECT * FROM "events"')
      assert.lengthOf(rs.rows, 1)
    })
  })
})
