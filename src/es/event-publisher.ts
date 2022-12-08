import pg from 'pg'
import { promises as fs } from 'fs'
import { DATABASE_CONNECTION_STRING } from '../config.js'
import { CanonicalEntityId } from './canonical-entity-id.js'
import { UnpublishedEvent } from './unpublished-event.js'

export class EventPublisher {

  async publish(event: UnpublishedEvent, entity: CanonicalEntityId, actor: string): Promise<void> {
    const db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()

    const schema = await fs.readFile('./src/es/schema.sql')
    await db.query(schema.toString('utf-8'))

    await db.query('BEGIN TRANSACTION')

    try {
      const result = await db.query('SELECT "version" FROM "entities" WHERE id = $1', [ entity.id ])
      if (result.rowCount === 0)
        await db.query('INSERT INTO "entities" (id, type, version) VALUES ($1, $2, $3)',
          [ entity.id, entity.type, 0 ])

      const nextVersion: number = result.rowCount === 0 ? 0 : result.rows[0].version + 1

      const positionResult = await db.query('SELECT MAX("position") AS position FROM "events"')
      const nextPosition: number = (positionResult.rows[0].position ?? -1) + 1

      await db.query('INSERT INTO "events" (entity_id, entity_type, name, details, actor, version, position) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [ entity.id, entity.type, event.name, JSON.stringify(event.details), actor, nextVersion, nextPosition ])

      await db.query('COMMIT')
    } catch(error) {
      await db.query('ROLLBACK')
      throw error
    } finally {
      await db.end()
    }
  }
}
