import pg from 'pg';
import { DATABASE_CONNECTION_STRING } from '../../config.js';
import * as domain from './domain.js';
export class EntityRepository {
    async getHistoryFor(id) {
        const db = new pg.Client(DATABASE_CONNECTION_STRING);
        await db.connect();
        try {
            const data = await getVersion(id, db);
            if (data === undefined)
                return undefined;
            const { version, type } = data;
            const events = await getPublishedEvents(id, db);
            return new domain.EntityHistory(type, domain.EntityVersion.of(version), events);
        }
        finally {
            await db.end();
        }
    }
}
async function getVersion(id, db) {
    const rs = await db.query('SELECT version, type FROM "entities" WHERE id = $1', [id]);
    return rs.rows[0];
}
async function getPublishedEvents(id, db) {
    const rs = await db.query('SELECT * FROM "events" WHERE entity_id = $1 ORDER BY version', [id]);
    return rs.rows.map(r => new domain.PublishedEvent(r.name, JSON.parse(r.details)));
}
