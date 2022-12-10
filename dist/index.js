var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b;
import { EventPublisher } from './es/event-publisher.js';
import { EntityRepository } from './es/entity-repository.js';
import { EventProjection } from './es/event-projection.js';
import { NOT_FOUND, NO_CONTENT, setupServer, StatusCode } from './server.js';
import { Item } from './domain/item.js';
let repository = new EntityRepository();
let publisher = new EventPublisher();
let projection = new EventProjection();
const setup = setupServer();
setup.get('/entity/:id', (request) => __awaiter(void 0, void 0, void 0, function* () {
    const id = request.params.id;
    const history = yield repository.getHistoryFor(id);
    return history !== null && history !== void 0 ? history : NOT_FOUND;
}));
setup.post('/item', (request) => __awaiter(void 0, void 0, void 0, function* () {
    const body = yield readBody(request);
    const item = Item.new(body.title, body.type);
    yield publisher.publishChanges(item, 'system_actor');
    yield projectUnpublishedEvents([item]);
    return {
        statusCode: StatusCode.Created,
        content: JSON.stringify(item.id),
    };
}));
setup.post('/item/:id/child', (request) => __awaiter(void 0, void 0, void 0, function* () {
    const id = request.params.id;
    const body = yield readBody(request);
    const history = yield repository.getHistoryFor(id);
    if (!history || history.type !== Item.TYPE_CODE)
        return NOT_FOUND;
    const parent = Item.reconstitute(id, history.version, history.events);
    const item = Item.new(body.title, body.type);
    parent.add(item);
    yield publisher.publishChanges([parent, item], 'system_actor');
    yield projectUnpublishedEvents([item, parent]);
    return {
        statusCode: StatusCode.Created,
        content: JSON.stringify(item.id),
    };
}));
setup.patch('/item/:id/complete', (request) => __awaiter(void 0, void 0, void 0, function* () {
    const id = request.params.id;
    const history = yield repository.getHistoryFor(id);
    if (!history || history.type !== Item.TYPE_CODE)
        return NOT_FOUND;
    const item = Item.reconstitute(id, history.version, history.events);
    item.complete();
    yield publisher.publishChanges(item, 'system_actor');
    yield projectUnpublishedEvents([item]);
    return NO_CONTENT;
}));
setup.patch('/item/:id/promote', (request) => __awaiter(void 0, void 0, void 0, function* () {
    const id = request.params.id;
    const history = yield repository.getHistoryFor(id);
    if (!history || history.type !== Item.TYPE_CODE)
        return NOT_FOUND;
    const item = Item.reconstitute(id, history.version, history.events);
    item.promote();
    yield publisher.publishChanges(item, 'system_actor');
    yield projectUnpublishedEvents([item]);
    return NO_CONTENT;
}));
function readBody(request) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            request.setEncoding('utf-8');
            let body = '';
            request.on('data', data => { body += data; });
            request.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                }
                catch (error) {
                    reject({ error: error.toString() });
                }
            });
        });
    });
}
function projectUnpublishedEvents(entities) {
    return __awaiter(this, void 0, void 0, function* () {
        yield projection.sync(entities.map(entity => entity.unpublishedEvents
            .map(e => ({
            entity: entity.id,
            name: e.name,
            details: e.details,
        })))
            .flat());
    });
}
const server = setup.finalize();
const port = (_b = parseInt((_a = process.env.PORT) !== null && _a !== void 0 ? _a : '80')) !== null && _b !== void 0 ? _b : 80;
server.listenAtPort(port);
process.stdout.write(`\x1B[35mListening on port \x1B[30m${port !== null && port !== void 0 ? port : '80'}\x1B[0m\n\n`);
export function start({ projection: testProjection, repository: testRepository, publisher: testPublisher }) {
    if (testRepository)
        repository = testRepository;
    if (testPublisher)
        publisher = testPublisher;
    if (testProjection)
        projection = testProjection;
    server.stopListening();
    server.listenAtPort(port);
}
export function stop() {
    server.stopListening();
}
