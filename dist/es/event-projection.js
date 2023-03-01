import pg from 'pg';
import { promises as fs } from 'fs';
import { DATABASE_CONNECTION_STRING } from '../config.js';
import { ItemEvent, Progress } from '../domain/enums.js';
import { Feature } from '../domain/feature.js';
import { Task } from '../domain/task.js';
export class EventProjection {
    async sync(events) {
        const db = new pg.Client(DATABASE_CONNECTION_STRING);
        await db.connect();
        const schema = await fs.readFile('./schema/sync.sql');
        await db.query(schema.toString('utf-8'));
        try {
            for (const event of events.filter(e => [Feature.TYPE_CODE, Task.TYPE_CODE].indexOf(e.entity.type) >= 0)) {
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
                    case 'TypeChanged':
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
        await db.query('UPDATE "items" SET type = \'Story\' WHERE id = $1 AND type = \'Task\'', [event.details.parent]);
        await db.query('UPDATE "items" SET type = \'Epic\' WHERE id = $1 AND type = \'Feature\'', [event.details.parent]);
        await db.query('UPDATE "items" SET parent_id = $2 WHERE id = $1', [event.entity.id, event.details.parent]);
    }
    async onProgressChanged(event, db) {
        await db.query('UPDATE "items" SET progress = $2 WHERE id = $1', [event.entity.id, event.details.progress]);
    }
    async onTypeChanged(event, db) {
        await db.query('UPDATE "items" SET type = $2 WHERE id = $1', [event.entity.id, event.details.type]);
    }
}
