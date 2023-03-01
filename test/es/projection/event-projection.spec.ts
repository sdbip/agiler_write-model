import { assert } from 'chai'
import pg from 'pg'
import { DATABASE_CONNECTION_STRING } from '../../../src/config.js'
import { ItemEvent, ItemType, Progress } from '../../../src/domain/enums.js'
import { Task } from '../../../src/domain/task.js'
import { EventProjection } from '../../../src/es/event-projection.js'
import { CanonicalEntityId } from '../../../src/es/source.js'

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

  it('ignores unhandled events', async () => {
    await projection.sync([
      {
        name: ItemEvent.ChildrenAdded,
        entity: new CanonicalEntityId('id', 'Item'),
        details: { parent: 'new_parent_id' },
      },
    ])

    const result = await db.query('SELECT * FROM "items"')
    assert.equal(result.rowCount, 0)
  })

  describe(`on "${ItemEvent.Created}"`, () => {

    it('adds row in "items" table', async () => {
      await projection.sync([
        {
          name: ItemEvent.Created,
          entity: new CanonicalEntityId('id', Task.TYPE_CODE),
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

    it('does not add row if not Item', async () => {
      await projection.sync([
        {
          name: ItemEvent.Created,
          entity: new CanonicalEntityId('id', 'Unexpected TYPE CODE'),
          details: { title: 'Title', type: ItemType.Task },
        },
      ])

      const result = await db.query('SELECT * FROM "items"')
      assert.equal(result.rowCount, 0)
    })
  })

  describe(`on "${ItemEvent.ParentChanged}"`, () => {

    const originalItem = {
      id: 'id',
      parent_id: null,
      progress: Progress.NotStarted,
      title: 'Get it done',
      type: ItemType.Task,
    }

    beforeEach(async () => {
      await projection.sync([])
      await db.query("INSERT INTO Items (id, type, progress, title) VALUES ('id', 'Task', 'notStarted', 'Get it done')")
    })

    it('sets the parent_id column', async () => {
      await projection.sync([
        {
          name: ItemEvent.ParentChanged,
          entity: new CanonicalEntityId('id', Task.TYPE_CODE),
          details: { parent: 'new_parent_id' },
        },
      ])

      const result = await db.query('SELECT * FROM "items"')
      assert.equal(result.rowCount, 1)
      assert.deepEqual(result.rows[0], {
        ...originalItem,
        parent_id: 'new_parent_id',
      })
    })

    it('does not add row if not Item', async () => {
      await projection.sync([
        {
          name: ItemEvent.ParentChanged,
          entity: new CanonicalEntityId('id', 'Unexpected TYPE CODE'),
          details: { parent: 'parent_id' },
        },
      ])

      const result = await db.query('SELECT * FROM "items"')
      assert.deepEqual(result.rows[0], originalItem)
    })
  })

  describe(`on "${ItemEvent.ProgressChanged}"`, () => {

    const originalItem = {
      id: 'id',
      parent_id: null,
      progress: Progress.NotStarted,
      title: 'Get it done',
      type: ItemType.Task,
    }

    beforeEach(async () => {
      await projection.sync([])
      await db.query(
        'INSERT INTO Items (id, type, progress, title) VALUES ($1, $2, $3, $4)',
        [ originalItem.id, originalItem.type, originalItem.progress, originalItem.title ])
    })

    it('sets the parent_id column', async () => {
      await projection.sync([
        {
          name: ItemEvent.ProgressChanged,
          entity: new CanonicalEntityId('id', Task.TYPE_CODE),
          details: { progress: Progress.Completed },
        },
      ])

      const result = await db.query('SELECT * FROM "items"')
      assert.equal(result.rowCount, 1)
      assert.deepEqual(result.rows[0], {
        ...originalItem,
        progress: Progress.Completed,
      })
    })

    it('does not update if not Item', async () => {
      await projection.sync([
        {
          name: ItemEvent.ProgressChanged,
          entity: new CanonicalEntityId('id', 'Unexpected TYPE CODE'),
          details: { progress: Progress.Completed },
        },
      ])

      const result = await db.query('SELECT * FROM "items"')
      assert.deepEqual(result.rows[0], originalItem)
    })
  })
})
