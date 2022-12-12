import { EventProjection } from './es/event-projection.js'
import { NOT_FOUND, NO_CONTENT, Request, setupServer, StatusCode } from './server.js'
import { Item } from './domain/item.js'
import { Entity, EntityRepository, EventPublisher } from './es/source.js'

let repository = new EntityRepository()
let publisher = new EventPublisher()
let projection = new EventProjection()

const setup = setupServer()

setup.post('/item', async (request) => {
  const body = await readBody(request)
  const item = Item.new(body.title, body.type)
  await publisher.publishChanges(item, 'system_actor')
  await projectUnpublishedEvents([ item ])
  return {
    statusCode: StatusCode.Created,
    content: JSON.stringify(item.id),
  }
})

setup.get('/item/:id', async (request) => {
  const id = request.params.id as string
  const history = await repository.getHistoryFor(id)
  return history ?? NOT_FOUND
})

setup.post('/item/:id/child', async (request) => {
  const id = request.params.id as string
  const body = await readBody(request)

  const history = await repository.getHistoryFor(id)
  if (!history || history.type !== Item.TYPE_CODE) return NOT_FOUND

  const parent = Item.reconstitute(id, history.version, history.events)
  const item = Item.new(body.title, body.type)
  parent.add(item)

  await publisher.publishChanges([ parent, item ], 'system_actor')
  await projectUnpublishedEvents([ item, parent ])
  return {
    statusCode: StatusCode.Created,
    content: JSON.stringify(item.id),
  }
})

setup.patch('/item/:id/complete', async (request) => {
  const id = request.params.id as string
  const history = await repository.getHistoryFor(id)
  if (!history || history.type !== Item.TYPE_CODE) return NOT_FOUND

  const item = Item.reconstitute(id, history.version, history.events)
  item.complete()
  await publisher.publishChanges(item, 'system_actor')
  await projectUnpublishedEvents([ item ])
  return NO_CONTENT
})

setup.patch('/item/:id/promote', async (request) => {
  const id = request.params.id as string
  const history = await repository.getHistoryFor(id)
  if (!history || history.type !== Item.TYPE_CODE) return NOT_FOUND

  const item = Item.reconstitute(id, history.version, history.events)
  item.promote()
  await publisher.publishChanges(item, 'system_actor')
  await projectUnpublishedEvents([ item ])
  return NO_CONTENT
})

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
