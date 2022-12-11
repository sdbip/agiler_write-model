import { assert } from 'chai'
import http from 'http'
import { PORT } from '../src/config.js'
import { Item } from '../src/domain/item.js'
import { EntityHistory } from '../src/es/entity-history.js'
import { EntityVersion } from '../src/es/entity-version.js'
import { PublishedEvent } from '../src/es/published-event.js'
import { injectServices, startServer, stopServer } from '../src/index.js'
import { StatusCode } from '../src/server.js'
import { MockEntityRepository } from './mocks.js'
import { readResponse } from './read-response.js'
import { Response } from './response.js'

describe('GET /entity/:id', () => {

  let repository: MockEntityRepository

  before(startServer)
  after(stopServer)

  beforeEach(() => {
    repository = new MockEntityRepository()
    injectServices({ repository })
  })

  it('returns the complete history of the entity', async () => {
    repository.nextHistory = new EntityHistory(
      'Item',
      EntityVersion.of(2),
      [ new PublishedEvent('event', { value: 12 }) ],
    )
    const response = await getEntity('id')

    assert.equal(response.statusCode, StatusCode.OK)
    assert.deepEqual(JSON.parse(response.content), {
      type: Item.TYPE_CODE,
      version: EntityVersion.of(2),
      events: [
        {
          name: 'event',
          details: { value: 12 },
        },
      ],
    })
  })

  it('returns 404 if not found', async () => {
    const response = await getEntity('some_id')
    assert.equal(response.statusCode, StatusCode.NotFound)
  })
})

function getEntity(id: string) { return get(`http://localhost:${PORT}/entity/${id}`) }

function get(url: string) {
  return new Promise<Response>((resolve) => {
    const request = http.get(url, async response => {
      resolve(await readResponse(response))
    })

    request.end()
  })
}
