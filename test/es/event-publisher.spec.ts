import { assert } from 'chai'
import pg from 'pg'
import { DATABASE_CONNECTION_STRING } from '../../src/config.js'
import * as source from '../../src/es/source.js'

describe(source.EventPublisher.name, () => {

  let db: pg.Client
  const publisher = new source.EventPublisher()

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
      const entity = new source.CanonicalEntityId('entity', 'type')
      const event = new source.UnpublishedEvent('event', { value: 1 })
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
      const entity = new source.CanonicalEntityId('entity', 'type')
      const event = new source.UnpublishedEvent('event', { value: 1 })
      await publisher.publish(event, entity, 'test-system')
      await publisher.publish(event, entity, 'test-system')

      const rs = await db.query('SELECT * FROM "entities"')
      assert.lengthOf(rs.rows, 1)
    })

    it('publishes the event', async () => {
      const entity = new source.CanonicalEntityId('entity', 'type')
      const event = new source.UnpublishedEvent('event', { value: 1 })
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
      const entity = new source.CanonicalEntityId('entity', 'type')
      await publisher.publish(new source.UnpublishedEvent('event1', {}), entity, 'test-system')
      await publisher.publish(new source.UnpublishedEvent('event2', {}), entity, 'test-system')

      const rs = await db.query('SELECT * FROM "events" ORDER BY "version"')
      assert.lengthOf(rs.rows, 2)
      assert.equal(rs.rows[1].version, 1)
      assert.equal(rs.rows[1].position, 1)
    })
  })

  describe('publishChanges(entity)', () => {

    it('creates entity if it does not exist', async () => {
      const entity = {
        id: new source.CanonicalEntityId('entity', 'type'),
        version: source.EntityVersion.new,
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
        id: new source.CanonicalEntityId('entity', 'type'),
        version: source.EntityVersion.new,
        unpublishedEvents: [],
      }, 'test.system')
      await publisher.publishChanges({
        id: new source.CanonicalEntityId('entity', 'type'),
        version: source.EntityVersion.of(0),
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
        id: new source.CanonicalEntityId('entity', 'type'),
        version: source.EntityVersion.new,
        unpublishedEvents: [
          new source.UnpublishedEvent('event1', { value: 1 }),
          new source.UnpublishedEvent('event2', {}),
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
        id: new source.CanonicalEntityId('entity', 'type'),
        unpublishedEvents: [],
        version: source.EntityVersion.new,
      }

      const event = new source.UnpublishedEvent('event', { value: 1 })
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

  describe('publishChanges(Entity[])', () => {

    it('creates entities if they do not exist', async () => {
      const entity = {
        id: new source.CanonicalEntityId('entity', 'type'),
        version: source.EntityVersion.new,
        unpublishedEvents: [],
      }
      await publisher.publishChanges([ entity ], 'test.system')

      const rs = await db.query('SELECT * FROM "entities"')
      assert.lengthOf(rs.rows, 1)
      assert.deepEqual(rs.rows[0], {
        id: 'entity',
        type: 'type',
        version: 0,
      })
    })

    it('throws if same entity is included twice', async () => {
      const entity = {
        id: new source.CanonicalEntityId('entity', 'type'),
        version: source.EntityVersion.new,
        unpublishedEvents: [],
      }

      let thrown: any
      try {
        await publisher.publishChanges([ entity, { ...entity } ], 'test.system')
      } catch (error) {
        thrown = error
      }
      assert.exists(thrown)

      const rs = await db.query('SELECT * FROM "entities"')
      assert.lengthOf(rs.rows, 0)
    })

    it('publishes all events', async () => {
      const entity1 = {
        id: new source.CanonicalEntityId('entity1', 'type'),
        version: source.EntityVersion.new,
        unpublishedEvents: [
          new source.UnpublishedEvent('event1', { value: 1 }),
          new source.UnpublishedEvent('event2', {}),
        ],
      }
      const entity2 = {
        id: new source.CanonicalEntityId('entity2', 'type'),
        version: source.EntityVersion.new,
        unpublishedEvents: [
          new source.UnpublishedEvent('event1', { value: 1 }),
          new source.UnpublishedEvent('event2', {}),
        ],
      }
      await publisher.publishChanges([ entity1, entity2 ], 'test-system')

      const rs = await db.query('SELECT * FROM "events"')
      assert.lengthOf(rs.rows, 4)
    })

    it('does not publish if entity has already changed', async () => {

      const entity = {
        id: new source.CanonicalEntityId('entity', 'type'),
        unpublishedEvents: [],
        version: source.EntityVersion.new,
      }

      const event = new source.UnpublishedEvent('event', { value: 1 })
      await publisher.publish(event, entity.id, 'test-system')

      let caught: unknown
      try {
        await publisher.publishChanges([ entity ], 'test.system')
      } catch (error) {
        caught = error
      }

      assert.exists(caught, 'publishChanges should have thrown error')

      const rs = await db.query('SELECT * FROM "events"')
      assert.lengthOf(rs.rows, 1)
    })
  })
})
