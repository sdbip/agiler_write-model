import { EntityRepository } from './EntityRepository.js'
import { EventPublisher } from './EventPublisher.js'
import { EventPublisher as PGEventPublisher } from './es/event-publisher.js'
import { EntityRepository as PGEntityRepository } from './es/entity-repository.js'
import { Request, setupServer } from './server.js'
import { Item } from './domain/item.js'

let repository: EntityRepository = new PGEntityRepository()
let publisher: EventPublisher = new PGEventPublisher()

const setup = setupServer()
setup.get('/', async () => {
  return { message: 'alive', test: process.env.TEST }
})

setup.post('/item', async (request) => {
  const body = await readBody(request)
  const item = Item.new(body.title)
  await publisher.publishChanges(item, 'write-model')
  return {
    statusCode: 200,
    content: JSON.stringify(item.id),
  }
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
