import { EventProjection } from './es/event-projection.js';
import { EntityRepository, EventPublisher } from './es/source.js';
import { ResponseObject, StatusCode } from './response.js';
import { setupServer } from './server.js';
import { Feature } from './domain/feature.js';
import { Task } from './domain/task.js';
import { ItemEvent, ItemType } from './domain/enums.js';
let repository = new EntityRepository();
let publisher = new EventPublisher();
let projection = new EventProjection();
const setup = setupServer();
setup.post('/item', async (request) => {
    const actor = getAuthenticatedUser(request);
    if (!actor)
        return ResponseObject.Unauthorized;
    const body = await readBody(request);
    switch (body.type) {
        case ItemType.Epic:
        case ItemType.Feature:
            {
                const item = Feature.new(body.title, body.type);
                await publishChanges([item], actor);
                return {
                    statusCode: StatusCode.Created,
                    content: JSON.stringify(item.id),
                };
            }
        case ItemType.Story:
        case ItemType.Task:
            {
                const item = Task.new(body.title, body.type);
                await publishChanges([item], actor);
                return {
                    statusCode: StatusCode.Created,
                    content: JSON.stringify(item.id),
                };
            }
        default:
            return {
                statusCode: StatusCode.InternalServerError,
                content: 'This case is not supported',
            };
    }
});
setup.post('/feature', async (request) => {
    const actor = getAuthenticatedUser(request);
    if (!actor)
        return ResponseObject.Unauthorized;
    const body = await readBody(request);
    const feature = Feature.new(body.title);
    await publishChanges([feature], actor);
    return {
        statusCode: StatusCode.Created,
        content: JSON.stringify(feature.id),
    };
});
setup.post('/task', async (request) => {
    const actor = getAuthenticatedUser(request);
    if (!actor)
        return ResponseObject.Unauthorized;
    const body = await readBody(request);
    const task = Task.new(body.title);
    await publishChanges([task], actor);
    return {
        statusCode: StatusCode.Created,
        content: JSON.stringify(task.id),
    };
});
setup.get('/item/:id', async (request) => {
    const id = request.params.id;
    const history = await repository.getHistoryFor(id);
    return history ?? ResponseObject.NotFound;
});
setup.post('/item/:id/child', async (request) => {
    const actor = getAuthenticatedUser(request);
    if (!actor)
        return ResponseObject.Unauthorized;
    const id = request.params.id;
    const body = await readBody(request);
    const history = await repository.getHistoryFor(id);
    if (!history || (history.type !== 'Item' && history.type !== Feature.TYPE_CODE && history.type !== Task.TYPE_CODE))
        return ResponseObject.NotFound;
    const typeDefiningEvents = history.events.filter(e => e.name === 'TypeChanged' || e.name === ItemEvent.Created);
    const lastTypeDefiningEvent = typeDefiningEvents[typeDefiningEvents.length - 1];
    switch (lastTypeDefiningEvent.details.type) {
        case ItemType.Feature:
        case ItemType.Epic:
            {
                const parent = Feature.reconstitute(id, history.version, history.events);
                const child = Feature.new(body.title, body.type);
                parent.add(child);
                await publishChanges([parent, child], actor);
                return {
                    statusCode: StatusCode.Created,
                    content: JSON.stringify(child.id),
                };
            }
        case ItemType.Story:
        case ItemType.Task:
            {
                const parent = Task.reconstitute(id, history.version, history.events);
                const child = Task.new(body.title, body.type);
                parent.add(child);
                await publishChanges([parent, child], actor);
                return {
                    statusCode: StatusCode.Created,
                    content: JSON.stringify(child.id),
                };
            }
        default:
            return {
                statusCode: StatusCode.InternalServerError,
                content: 'This case is not supported',
            };
    }
});
setup.post('/feature/:id/child', async (request) => {
    const actor = getAuthenticatedUser(request);
    if (!actor)
        return ResponseObject.Unauthorized;
    const id = request.params.id;
    const body = await readBody(request);
    const history = await repository.getHistoryFor(id);
    if (!history || history.type !== Feature.TYPE_CODE)
        return ResponseObject.NotFound;
    const parent = Feature.reconstitute(id, history.version, history.events);
    const feature = Feature.new(body.title, body.type);
    parent.add(feature);
    await publishChanges([parent, feature], actor);
    return {
        statusCode: StatusCode.Created,
        content: JSON.stringify(feature.id),
    };
});
setup.post('/task/:id/child', async (request) => {
    const actor = getAuthenticatedUser(request);
    if (!actor)
        return ResponseObject.Unauthorized;
    const id = request.params.id;
    const body = await readBody(request);
    const history = await repository.getHistoryFor(id);
    if (!history || history.type !== Task.TYPE_CODE)
        return ResponseObject.NotFound;
    const parent = Task.reconstitute(id, history.version, history.events);
    const task = Task.new(body.title, body.type);
    parent.add(task);
    await publishChanges([parent, task], actor);
    return {
        statusCode: StatusCode.Created,
        content: JSON.stringify(task.id),
    };
});
setup.patch('/item/:id/complete', async (request) => {
    const actor = getAuthenticatedUser(request);
    if (!actor)
        return ResponseObject.Unauthorized;
    const id = request.params.id;
    const history = await repository.getHistoryFor(id);
    if (!history || history.type !== Task.TYPE_CODE)
        return ResponseObject.NotFound;
    const item = Task.reconstitute(id, history.version, history.events);
    item.finish();
    await publishChanges([item], actor);
    return ResponseObject.NoContent;
});
setup.patch('/task/:id/finish', async (request) => {
    const actor = getAuthenticatedUser(request);
    if (!actor)
        return ResponseObject.Unauthorized;
    const id = request.params.id;
    const history = await repository.getHistoryFor(id);
    if (!history || history.type !== Task.TYPE_CODE)
        return ResponseObject.NotFound;
    const task = Task.reconstitute(id, history.version, history.events);
    task.finish();
    await publishChanges([task], actor);
    return ResponseObject.NoContent;
});
setup.patch('/item/:id/promote', async () => {
    return ResponseObject.NoContent;
});
function getAuthenticatedUser(request) {
    return request.header('Authorization');
}
async function readBody(request) {
    return await new Promise((resolve, reject) => {
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
}
async function publishChanges(items, actor) {
    await publisher.publishChanges(items, actor);
    await projectUnpublishedEvents(items);
}
async function projectUnpublishedEvents(entities) {
    await projection.sync(entities.map(entity => entity.unpublishedEvents
        .map(e => ({
        entity: entity.id,
        name: e.name,
        details: e.details,
    })))
        .flat());
}
const server = setup.finalize();
const port = parseInt(process.env.PORT ?? '80') ?? 80;
server.listenAtPort(port);
process.stdout.write(`\x1B[35mListening on port \x1B[30m${port ?? '80'}\x1B[0m\n\n`);
export function injectServices({ projection: testProjection, repository: testRepository, publisher: testPublisher }) {
    if (testRepository)
        repository = testRepository;
    if (testPublisher)
        publisher = testPublisher;
    if (testProjection)
        projection = testProjection;
}
export function startServer() {
    server.stopListening();
    server.listenAtPort(port);
}
export function stopServer() {
    server.stopListening();
}
