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
      const version = await getVersion(entity, db)
      if (version === undefined) return undefined

      const events = await getPublishedEvents(entity.id, db)
      return new EntityHistory(entity, EntityVersion.of(version), events)
    } finally {
      await db.end()
    }
  }
}

async function getVersion(entity: CanonicalEntityId, db: pg.Client) {
  const rs = await db.query('SELECT version FROM "entities" WHERE id = $1 AND type = $2', [ entity.id, entity.type ])
  return rs.rows[0]?.version
}

async function getPublishedEvents(id: string, db: pg.Client) {
  const rs = await db.query('SELECT * FROM "events" WHERE entity_id = $1 ORDER BY version', [ id ])
  return rs.rows.map(r => new PublishedEvent(r.name, JSON.parse(r.details)))
}
