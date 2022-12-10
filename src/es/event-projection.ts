import pg from 'pg'
import { promises as fs } from 'fs'
import { DATABASE_CONNECTION_STRING } from '../config'
import { CanonicalEntityId } from './canonical-entity-id'
import { Progress } from '../domain/enums'

export type Event = {
  entity: CanonicalEntityId,
  name: string,
  details: Record<string, unknown>,
}

export class EventProjection {

  async sync(events: Event[]) {
    const db = new pg.Client(DATABASE_CONNECTION_STRING)
    await db.connect()
    const schema = await fs.readFile('./schema/sync.sql')
    await db.query(schema.toString('utf-8'))

    for (const event of events) {
      await this.onCreated(event, db)
    }
    await db.end()
  }

  private async onCreated(event: Event, db: pg.Client) {
    await db.query(
      'INSERT INTO "items" (id, type, progress, title) VALUES ($1, $2, $3, $4)',
      [ event.entity.id, event.details.type, Progress.NotStarted, event.details.title ])
  }
}
