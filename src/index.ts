import { EventProjection } from './es/event-projection.js'
import { Entity, EntityRepository, EventPublisher } from './es/source.js'
import { Item } from './domain/item.js'
import { ResponseObject, StatusCode } from './response.js'
import { Request, setupServer } from './server.js'
import { Feature } from './domain/feature.js'
import { Task } from './domain/task.js'

let repository = new EntityRepository()
let publisher = new EventPublisher()
let projection = new EventProjection()

const setup = setupServer()

setup.post('/item', async (request) => {
  const actor = getAuthenticatedUser(request)
  if (!actor) return ResponseObject.Unauthorized

  const body = await readBody(request)
  const item = Item.new(body.title, body.type)
  await publishChanges([ item ], actor)
  return {
    statusCode: StatusCode.Created,
    content: JSON.stringify(item.id),
  }
})

setup.post('/feature', async (request) => {
  const actor = getAuthenticatedUser(request)
  if (!actor) return ResponseObject.Unauthorized

  const body = await readBody(request)
  const feature = Feature.new(body.title)
  await publishChanges([ feature ], actor)
  return {
    statusCode: StatusCode.Created,
    content: JSON.stringify(feature.id),
  }
})

setup.post('/task', async (request) => {
  const actor = getAuthenticatedUser(request)
  if (!actor) return ResponseObject.Unauthorized

  const body = await readBody(request)
  const task = Task.new(body.title)
  await publishChanges([ task ], actor)
  return {
    statusCode: StatusCode.Created,
    content: JSON.stringify(task.id),
  }
})

setup.get('/item/:id', async (request) => {
  const id = request.params.id as string
  const history = await repository.getHistoryFor(id)
  return history ?? ResponseObject.NotFound
})

setup.post('/item/:id/child', async (request) => {
  const actor = getAuthenticatedUser(request)
  if (!actor) return ResponseObject.Unauthorized

  const id = request.params.id as string
  const body = await readBody(request)

  const history = await repository.getHistoryFor(id)
  if (!history || history.type !== Item.TYPE_CODE) return ResponseObject.NotFound

  const parent = Item.reconstitute(id, history.version, history.events)
  const item = Item.new(body.title, body.type)
  parent.add(item)

  await publishChanges([ parent, item ], actor)
  return {
    statusCode: StatusCode.Created,
    content: JSON.stringify(item.id),
  }
})

setup.post('/feature/:id/child', async (request) => {
  const actor = getAuthenticatedUser(request)
  if (!actor) return ResponseObject.Unauthorized

  const id = request.params.id as string
  const body = await readBody(request)

  const history = await repository.getHistoryFor(id)
  if (!history || history.type !== Feature.TYPE_CODE) return ResponseObject.NotFound

  const parent = Feature.reconstitute(id, history.version, history.events)
  const feature = Feature.new(body.title, body.type)
  parent.add(feature)

  await publishChanges([ parent, feature ], actor)
  return {
    statusCode: StatusCode.Created,
    content: JSON.stringify(feature.id),
  }
})

setup.post('/task/:id/child', async (request) => {
  const actor = getAuthenticatedUser(request)
  if (!actor) return ResponseObject.Unauthorized

  const id = request.params.id as string
  const body = await readBody(request)

  const history = await repository.getHistoryFor(id)
  if (!history || history.type !== Task.TYPE_CODE) return ResponseObject.NotFound

  const parent = Task.reconstitute(id, history.version, history.events)
  const task = Task.new(body.title, body.type)
  parent.add(task)

  await publishChanges([ parent, task ], actor)
  return {
    statusCode: StatusCode.Created,
    content: JSON.stringify(task.id),
  }
})

setup.patch('/item/:id/complete', async (request) => {
  const actor = getAuthenticatedUser(request)
  if (!actor) return ResponseObject.Unauthorized

  const id = request.params.id as string
  const history = await repository.getHistoryFor(id)
  if (!history || history.type !== Item.TYPE_CODE) return ResponseObject.NotFound

  const item = Item.reconstitute(id, history.version, history.events)
  item.complete()
  await publishChanges([ item ], actor)
  return ResponseObject.NoContent
})

setup.patch('/task/:id/finish', async (request) => {
  const actor = getAuthenticatedUser(request)
  if (!actor) return ResponseObject.Unauthorized

  const id = request.params.id as string
  const history = await repository.getHistoryFor(id)
  if (!history || history.type !== Item.TYPE_CODE) return ResponseObject.NotFound

  const task = Task.reconstitute(id, history.version, history.events)
  task.finish()
  await publishChanges([ task ], actor)
  return ResponseObject.NoContent
})

setup.patch('/item/:id/promote', async (request) => {
  const actor = getAuthenticatedUser(request)
  if (!actor) return ResponseObject.Unauthorized

  const id = request.params.id as string
  const history = await repository.getHistoryFor(id)
  if (!history || history.type !== Item.TYPE_CODE) return ResponseObject.NotFound

  const item = Item.reconstitute(id, history.version, history.events)
  item.promote()
  await publishChanges([ item ], actor)
  return ResponseObject.NoContent
})

setup.patch('/task/:id/promote', async (request) => {
  const actor = getAuthenticatedUser(request)
  if (!actor) return ResponseObject.Unauthorized

  const id = request.params.id as string
  const history = await repository.getHistoryFor(id)
  if (!history || history.type !== Task.TYPE_CODE) return ResponseObject.NotFound

  const task = Task.reconstitute(id, history.version, history.events)
  task.promote()
  await publishChanges([ task ], actor)
  return ResponseObject.NoContent
})

function getAuthenticatedUser(request: Request) {
  return request.header('Authorization')
}

async function readBody(request: Request): Promise<any> {
  return await new Promise((resolve, reject) => {
    request.setEncoding('utf-8')
    let body = ''
    request.on('data', data => { body += data })
    request.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (error: any) {
        reject({ error: error.toString() })
      }
    })
  })
}

async function publishChanges(items: Entity[], actor: string) {
  await publisher.publishChanges(items, actor)
  await projectUnpublishedEvents(items)
}

async function projectUnpublishedEvents(entities: Entity[]) {
  await projection.sync(
    entities.map(entity => entity.unpublishedEvents
      .map(e => ({
        entity: entity.id,
        name: e.name,
        details: e.details,
      })))
      .flat())
}

const server = setup.finalize()
const port = parseInt(process.env.PORT ?? '80') ?? 80
server.listenAtPort(port)

process.stdout.write(`\x1B[35mListening on port \x1B[30m${port ?? '80'}\x1B[0m\n\n`)

export function injectServices({ projection: testProjection, repository: testRepository, publisher: testPublisher }: { repository?: EntityRepository, publisher?: EventPublisher, projection?: EventProjection }) {
  if (testRepository) repository = testRepository
  if (testPublisher) publisher = testPublisher
  if (testProjection) projection = testProjection
}

export function startServer() {
  server.stopListening()
  server.listenAtPort(port)
}

export function stopServer() {
  server.stopListening()
}
