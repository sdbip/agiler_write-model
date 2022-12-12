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
import { promises as fs } from 'fs';
import { DATABASE_CONNECTION_STRING } from '../../config.js';
import * as domain from './domain.js';
export class EventPublisher {
    publish(event, entity, actor) {
        return __awaiter(this, void 0, void 0, function* () {
            const db = new pg.Client(DATABASE_CONNECTION_STRING);
            yield db.connect();
            yield addSchema(db);
            yield transaction(db, (db) => __awaiter(this, void 0, void 0, function* () {
                const currentVersion = yield getVersion(entity, db);
                const lastPosition = yield getLastPosition(db);
                if (currentVersion.equals(domain.EntityVersion.new))
                    yield insertEntity(entity, db);
                yield insertEvent(entity, event, actor, currentVersion.next(), lastPosition + 1, db);
            }));
        });
    }
    publishChanges(entityOrEntities, actor) {
        return __awaiter(this, void 0, void 0, function* () {
            const entities = entityOrEntities instanceof Array ? entityOrEntities : [entityOrEntities];
            const db = new pg.Client(DATABASE_CONNECTION_STRING);
            yield db.connect();
            yield addSchema(db);
            yield transaction(db, (db) => __awaiter(this, void 0, void 0, function* () {
                const lastPosition = yield getLastPosition(db);
                for (const entity of entities) {
                    const currentVersion = yield getVersion(entity.id, db);
                    if (!entity.version.equals(currentVersion))
                        throw new Error(`Concurrent update of entity ${entity.id}`);
                    if (currentVersion.equals(domain.EntityVersion.new))
                        yield insertEntity(entity.id, db);
                    let version = currentVersion.next();
                    for (const event of entity.unpublishedEvents) {
                        yield insertEvent(entity.id, event, actor, version, lastPosition + 1, db);
                        version = version.next();
                    }
                }
            }));
        });
    }
}
function insertEvent(entity, event, actor, version, position, db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.query('INSERT INTO "events" (entity_id, entity_type, name, details, actor, version, position) VALUES ($1, $2, $3, $4, $5, $6, $7)', [entity.id, entity.type, event.name, JSON.stringify(event.details), actor, version.value, position]);
    });
}
function getLastPosition(db) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const positionResult = yield db.query('SELECT MAX("position") AS position FROM "events"');
        return (_a = positionResult.rows[0].position) !== null && _a !== void 0 ? _a : -1;
    });
}
function getVersion(entity, db) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield db.query('SELECT "version" FROM "entities" WHERE id = $1', [entity.id]);
        return result.rowCount === 0
            ? domain.EntityVersion.new
            : domain.EntityVersion.of(result.rows[0].version);
    });
}
function insertEntity(entity, db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.query('INSERT INTO "entities" (id, type, version) VALUES ($1, $2, $3)', [entity.id, entity.type, 0]);
    });
}
function transaction(db, action) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.query('BEGIN TRANSACTION');
        try {
            yield action(db);
            yield db.query('COMMIT');
        }
        catch (error) {
            yield db.query('ROLLBACK');
            throw error;
        }
        finally {
            yield db.end();
        }
    });
}
function addSchema(db) {
    return __awaiter(this, void 0, void 0, function* () {
        const schema = yield fs.readFile('./schema/es.sql');
        yield db.query(schema.toString('utf-8'));
    });
}
