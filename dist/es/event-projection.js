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
import { DATABASE_CONNECTION_STRING } from '../config.js';
import { ItemEvent, Progress } from '../domain/enums.js';
import { Item } from '../domain/item.js';
export class EventProjection {
    sync(events) {
        return __awaiter(this, void 0, void 0, function* () {
            const db = new pg.Client(DATABASE_CONNECTION_STRING);
            yield db.connect();
            const schema = yield fs.readFile('./schema/sync.sql');
            yield db.query(schema.toString('utf-8'));
            try {
                for (const event of events.filter(e => e.entity.type === Item.TYPE_CODE)) {
                    switch (event.name) {
                        case ItemEvent.Created:
                            yield this.onCreated(event, db);
                            break;
                        case ItemEvent.ParentChanged:
                            yield this.onParentChanged(event, db);
                            break;
                        case ItemEvent.ProgressChanged:
                            yield this.onProgressChanged(event, db);
                            break;
                        case ItemEvent.TypeChanged:
                            yield this.onTypeChanged(event, db);
                            break;
                    }
                }
            }
            finally {
                yield db.end();
            }
        });
    }
    onCreated(event, db) {
        return __awaiter(this, void 0, void 0, function* () {
            yield db.query('INSERT INTO "items" (id, type, progress, title) VALUES ($1, $2, $3, $4)', [event.entity.id, event.details.type, Progress.NotStarted, event.details.title]);
        });
    }
    onParentChanged(event, db) {
        return __awaiter(this, void 0, void 0, function* () {
            yield db.query('UPDATE "items" SET parent_id = $2 WHERE id = $1', [event.entity.id, event.details.parent]);
        });
    }
    onProgressChanged(event, db) {
        return __awaiter(this, void 0, void 0, function* () {
            yield db.query('UPDATE "items" SET progress = $2 WHERE id = $1', [event.entity.id, event.details.progress]);
        });
    }
    onTypeChanged(event, db) {
        return __awaiter(this, void 0, void 0, function* () {
            yield db.query('UPDATE "items" SET type = $2 WHERE id = $1', [event.entity.id, event.details.type]);
        });
    }
}
