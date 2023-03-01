import pg from 'pg'
import { promises as fs } from 'fs'
import { DATABASE_CONNECTION_STRING } from '../config.js'
import { CanonicalEntityId } from './source.js'
import { ItemEvent, Progress } from '../domain/enums.js'
import { Feature } from '../domain/feature.js'
import { Task } from '../domain/task.js'

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

    try {
      for (const event of events.filter(e => [ Feature.TYPE_CODE, Task.TYPE_CODE ].indexOf(e.entity.type) >= 0)) {
        switch (event.name) {
          case ItemEvent.Created:
            await this.onCreated(event, db)
            break
          case ItemEvent.ParentChanged:
            await this.onParentChanged(event, db)
            break
          case ItemEvent.ProgressChanged:
            await this.onProgressChanged(event, db)
            break
          case 'TypeChanged':
            await this.onTypeChanged(event, db)
            break
        }
      }
    } finally {
      await db.end()
    }
  }

  private async onCreated(event: Event, db: pg.Client) {
    await db.query(
      'INSERT INTO "items" (id, type, progress, title) VALUES ($1, $2, $3, $4)',
      [ event.entity.id, event.details.type, Progress.NotStarted, event.details.title ])
  }

  private async onParentChanged(event: Event, db: pg.Client) {
    await db.query(
      'UPDATE "items" SET parent_id = $2 WHERE id = $1',
      [ event.entity.id, event.details.parent ])
  }

  private async onProgressChanged(event: Event, db: pg.Client) {
    await db.query(
      'UPDATE "items" SET progress = $2 WHERE id = $1',
      [ event.entity.id, event.details.progress ])
  }

  private async onTypeChanged(event: Event, db: pg.Client) {
    await db.query(
      'UPDATE "items" SET type = $2 WHERE id = $1',
      [ event.entity.id, event.details.type ])
  }
}
