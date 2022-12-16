import pg from 'pg';
import { promises as fs } from 'fs';
import { DATABASE_CONNECTION_STRING } from '../config.js';
import { ItemEvent, Progress } from '../domain/enums.js';
import { Item } from '../domain/item.js';
export class EventProjection {
    async sync(events) {
        const db = new pg.Client(DATABASE_CONNECTION_STRING);
        await db.connect();
        const schema = await fs.readFile('./schema/sync.sql');
        await db.query(schema.toString('utf-8'));
        try {
            for (const event of events.filter(e => e.entity.type === Item.TYPE_CODE)) {
                switch (event.name) {
                    case ItemEvent.Created:
                        await this.onCreated(event, db);
                        break;
                    case ItemEvent.ParentChanged:
                        await this.onParentChanged(event, db);
                        break;
                    case ItemEvent.ProgressChanged:
                        await this.onProgressChanged(event, db);
                        break;
                    case ItemEvent.TypeChanged:
                        await this.onTypeChanged(event, db);
                        break;
                }
            }
        }
        finally {
            await db.end();
        }
    }
    async onCreated(event, db) {
        await db.query('INSERT INTO "items" (id, type, progress, title) VALUES ($1, $2, $3, $4)', [event.entity.id, event.details.type, Progress.NotStarted, event.details.title]);
    }
    async onParentChanged(event, db) {
        await db.query('UPDATE "items" SET parent_id = $2 WHERE id = $1', [event.entity.id, event.details.parent]);
    }
    async onProgressChanged(event, db) {
        await db.query('UPDATE "items" SET progress = $2 WHERE id = $1', [event.entity.id, event.details.progress]);
    }
    async onTypeChanged(event, db) {
        await db.query('UPDATE "items" SET type = $2 WHERE id = $1', [event.entity.id, event.details.type]);
    }
}
