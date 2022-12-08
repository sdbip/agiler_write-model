import pg from 'pg'
import { DATABASE_CONNECTION_STRING } from '../config.js'
import { CanonicalEntityId } from './canonical-entity-id.js'
import { EntityHistory } from './entity-history.js'
import { EntityVersion } from './entity-version.js'
import { PublishedEvent } from './published-event.js'

export class EntityRepository {
  async getHistoryFor(entity: CanonicalEntityId) {
    const db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()
    try {
      const entityData = await getEntityData(db, entity)
      if (entityData === undefined) return undefined
      if (entityData.type !== entity.type) throw new Error(`Incorrect type '${entity.type}'. Actual type: ${entityData.type}`)

      const events = await getPublishedEvents(entity, db)
      return new EntityHistory(entity, EntityVersion.of(entityData.version), events)
    } finally {
      await db.end()
    }
  }
}

async function getEntityData(db: pg.Client, entity: CanonicalEntityId) {
  const rs = await db.query('SELECT * FROM "entities" WHERE id = $1', [ entity.id ])
  return rs.rows[0]
}

async function getPublishedEvents(entity: CanonicalEntityId, db: pg.Client) {
  const rs = await db.query(
    'SELECT * FROM "events" WHERE entity_id = $1 ORDER BY version',
    [ entity.id ])
  return rs.rows.map(r => new PublishedEvent(r.name, r.details))
}
