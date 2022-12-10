import pg from 'pg'
import { promises as fs } from 'fs'
import { DATABASE_CONNECTION_STRING } from '../config.js'
import { CanonicalEntityId } from './canonical-entity-id.js'
import { UnpublishedEvent } from './unpublished-event.js'
import { EntityVersion } from './entity-version.js'
import { Entity } from './entity.js'

export class EventPublisher {

  async publish(event: UnpublishedEvent, entity: CanonicalEntityId, actor: string): Promise<void> {
    const db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()
    await addSchema(db)

    await transaction(db, async db => {
      const currentVersion = await getVersion(entity, db)
      const lastPosition = await getLastPosition(db)

      if (currentVersion.equals(EntityVersion.new))
        await insertEntity(entity, db)

      await insertEvent(entity, event, actor, currentVersion.next(), lastPosition + 1, db)
    })
  }

  async publishChanges(entityOrEntities: Entity | Entity[], actor: string) {
    const entities = entityOrEntities instanceof Array ? entityOrEntities : [ entityOrEntities ]

    const db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()
    await addSchema(db)

    await transaction(db, async db => {
      const lastPosition = await getLastPosition(db)

      for (const entity of entities) {
        const currentVersion = await getVersion(entity.id, db)

        if (!entity.version.equals(currentVersion))
          throw new Error(`Concurrent update of entity ${entity.id}`)

        if (currentVersion.equals(EntityVersion.new))
          await insertEntity(entity.id, db)

        let version = currentVersion.next()
        for (const event of entity.unpublishedEvents) {
          await insertEvent(entity.id, event, actor, version, lastPosition + 1, db)
          version = version.next()
        }
      }
    })
  }
}

async function insertEvent(entity: CanonicalEntityId, event: UnpublishedEvent, actor: string, version: EntityVersion, position: number, db: pg.Client) {
  await db.query('INSERT INTO "events" (entity_id, entity_type, name, details, actor, version, position) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [ entity.id, entity.type, event.name, JSON.stringify(event.details), actor, version.value, position ])
}

async function getLastPosition(db: pg.Client) {
  const positionResult = await db.query('SELECT MAX("position") AS position FROM "events"')
  return positionResult.rows[0].position as number ?? -1
}

async function getVersion(entity: CanonicalEntityId, db: pg.Client) {
  const result = await db.query('SELECT "version" FROM "entities" WHERE id = $1', [ entity.id ])
  return result.rowCount === 0
    ? EntityVersion.new
    : EntityVersion.of(result.rows[0].version)
}

async function insertEntity(entity: CanonicalEntityId, db: pg.Client) {
  await db.query('INSERT INTO "entities" (id, type, version) VALUES ($1, $2, $3)',
    [ entity.id, entity.type, 0 ])
}

async function transaction(db: pg.Client, action: (db: pg.Client) => Promise<void>) {
  await db.query('BEGIN TRANSACTION')
  try {
    await action(db)

    await db.query('COMMIT')
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    await db.end()
  }
}

async function addSchema(db: pg.Client) {
  const schema = await fs.readFile('./schema/es.sql')
  await db.query(schema.toString('utf-8'))
}
