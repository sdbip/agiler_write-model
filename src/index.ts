import { EntityRepository } from './EntityRepository.js'
import { EventPublisher } from './EventPublisher.js'
import { EventPublisher as PGEventPublisher } from './es/event-publisher.js'
import { EntityRepository as PGEntityRepository } from './es/entity-repository.js'
import { NOT_FOUND, NO_CONTENT, Request, setupServer, StatusCode } from './server.js'
import { Item } from './domain/item.js'
import { CanonicalEntityId } from './es/canonical-entity-id.js'

let repository: EntityRepository = new PGEntityRepository()
let publisher: EventPublisher = new PGEventPublisher()

const setup = setupServer()
setup.get('/', async () => {
  return { message: 'alive', test: process.env.TEST }
})

setup.post('/item', async (request) => {
  const body = await readBody(request)
  const item = Item.new(body.title, body.type)
  await publisher.publishChanges(item, 'system_actor')
  return {
    statusCode: StatusCode.Created,
    content: JSON.stringify(item.id),
  }
})

setup.post('/item/:id/child', async (request) => {
  const id = request.params.id as string
  const body = await readBody(request)

  const history = await repository.getHistoryFor(new CanonicalEntityId(id, Item.TYPE_CODE))
  if (!history) return NOT_FOUND

  const parent = Item.reconstitute(id, history.version, history.events)
  const item = Item.new(body.title, body.type)
  parent.add(item)

  await publisher.publishChanges([ parent, item ], 'system_actor')
  return {
    statusCode: StatusCode.Created,
    content: JSON.stringify(item.id),
  }
})

setup.patch('/item/:id/complete', async (request) => {
  const id = request.params.id as string
  const history = await repository.getHistoryFor(new CanonicalEntityId(id, Item.TYPE_CODE))
  if (!history) return NOT_FOUND

  const item = Item.reconstitute(id, history.version, history.events)
  item.complete()
  await publisher.publishChanges(item, 'system_actor')
  return NO_CONTENT
})

setup.patch('/item/:id/promote', async (request) => {
  const id = request.params.id as string
  const history = await repository.getHistoryFor(new CanonicalEntityId(id, Item.TYPE_CODE))
  if (!history) return NOT_FOUND

  const item = Item.reconstitute(id, history.version, history.events)
  item.promote()
  await publisher.publishChanges(item, 'system_actor')
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

const server = setup.finalize()
const port = parseInt(process.env.PORT ?? '80') ?? 80
server.listenAtPort(port)

process.stdout.write(`\x1B[35mListening on port \x1B[30m${port ?? '80'}\x1B[0m\n\n`)

export function start(testRepository: EntityRepository, testPublisher: EventPublisher) {
  repository = testRepository
  publisher = testPublisher
  server.stopListening()
  server.listenAtPort(port)
}

export function stop() {
  server.stopListening()
}
