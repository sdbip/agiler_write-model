var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import pg from 'pg';
import { DATABASE_CONNECTION_STRING } from '../../config.js';
import * as domain from './domain.js';
export class EntityRepository {
    getHistoryFor(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const db = new pg.Client(DATABASE_CONNECTION_STRING);
            yield db.connect();
            try {
                const data = yield getVersion(id, db);
                if (data === undefined)
                    return undefined;
                const { version, type } = data;
                const events = yield getPublishedEvents(id, db);
                return new domain.EntityHistory(type, domain.EntityVersion.of(version), events);
            }
            finally {
                yield db.end();
            }
        });
    }
}
function getVersion(id, db) {
    return __awaiter(this, void 0, void 0, function* () {
        const rs = yield db.query('SELECT version, type FROM "entities" WHERE id = $1', [id]);
        return rs.rows[0];
    });
}
function getPublishedEvents(id, db) {
    return __awaiter(this, void 0, void 0, function* () {
        const rs = yield db.query('SELECT * FROM "events" WHERE entity_id = $1 ORDER BY version', [id]);
        return rs.rows.map(r => new domain.PublishedEvent(r.name, JSON.parse(r.details)));
    });
}
