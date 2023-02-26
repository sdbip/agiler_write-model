import pg from 'pg'
import { promises as fs } from 'fs'
import { DATABASE_CONNECTION_STRING } from '../../config.js'
import * as domain from './domain.js'

export class EventPublisher {

  async publish(event: domain.UnpublishedEvent, entity: domain.CanonicalEntityId, actor: string): Promise<void> {
    const db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()
    await addSchema(db)

    await transaction(db, async db => {
      const currentVersion = await getVersion(entity, db)
      const maxVersion = await getLastEventVersion(entity, db)
      const lastPosition = await getLastPosition(db)

      if (currentVersion.equals(domain.EntityVersion.new))
        await insertEntity(entity, db)

      await insertEvent(entity, event, actor, maxVersion.next(), lastPosition + 1n, db) // maxVersion.next()
      await updateVersion(entity, currentVersion.next(), db)
    })
  }

  async publishChanges(entityOrEntities: domain.Entity | domain.Entity[], actor: string) {
    const entities = entityOrEntities instanceof Array ? entityOrEntities : [ entityOrEntities ]

    const db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()
    await addSchema(db)

    await transaction(db, async db => {
      const lastPosition = await getLastPosition(db)

      for (const entity of entities) {
        const currentVersion = await getVersion(entity.id, db)
        const maxVersion = await getLastEventVersion(entity.id, db)

        if (!entity.version.equals(currentVersion))
          throw new Error(`Concurrent update of entity ${entity.id}`)

        if (currentVersion.equals(domain.EntityVersion.new))
          await insertEntity(entity.id, db)

        let version = maxVersion.next()
        for (const event of entity.unpublishedEvents) {
          await insertEvent(entity.id, event, actor, version, lastPosition + 1n, db)
          version = version.next()
        }

        await updateVersion(entity.id, currentVersion.next(), db)
      }
    })
  }
}

async function insertEvent(entity: domain.CanonicalEntityId, event: domain.UnpublishedEvent, actor: string, version: domain.EntityVersion, position: bigint, db: pg.Client) {
  await db.query('INSERT INTO "events" (entity_id, entity_type, name, details, actor, version, position) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [ entity.id, entity.type, event.name, JSON.stringify(event.details), actor, version.value, position ])
}

async function getLastPosition(db: pg.Client) {
  const positionResult = await db.query('SELECT MAX("position") AS position FROM "events"')
  return BigInt(positionResult.rows[0].position ?? -1)
}

async function getVersion(entity: domain.CanonicalEntityId, db: pg.Client) {
  const result = await db.query('SELECT "version" FROM "entities" WHERE id = $1', [ entity.id ])
  return result.rowCount === 0
    ? domain.EntityVersion.new
    : domain.EntityVersion.of(result.rows[0].version)
}

async function getLastEventVersion(entity: domain.CanonicalEntityId, db: pg.Client) {
  const result = await db.query('SELECT MAX("version") AS version FROM "events" WHERE entity_id = $1', [ entity.id ])
  return result.rows[0].version === null
    ? domain.EntityVersion.new
    : domain.EntityVersion.of(result.rows[0].version)
}

async function updateVersion(entity: domain.CanonicalEntityId, version: domain.EntityVersion, db: pg.Client) {
  await db.query('UPDATE "entities" SET version = $2 WHERE id = $1',
    [ entity.id, version.value ])
}

async function insertEntity(entity: domain.CanonicalEntityId, db: pg.Client) {
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
