import { assert } from 'chai'
import { EntityHistory, EntityVersion, PublishedEvent } from '../src/es/source.js'
import { Task } from '../src/domain/task.js'
import { injectServices, startServer, stopServer } from '../src/index.js'
import { StatusCode } from '../src/response.js'
import { MockEntityRepository } from './mocks.js'
import { get } from './http.js'

describe('GET /item/:id', () => {

  let repository: MockEntityRepository

  before(startServer)
  after(stopServer)

  beforeEach(() => {
    repository = new MockEntityRepository()
    injectServices({ repository })
  })

  const getEntity = (id: string) => get(`/item/${id}`)

  it('returns the complete history of the item', async () => {
    repository.nextHistory = new EntityHistory(
      Task.TYPE_CODE,
      EntityVersion.of(2),
      [ new PublishedEvent('event', { value: 12 }) ],
    )
    const response = await getEntity('id')

    assert.equal(response.statusCode, StatusCode.OK)
    assert.deepEqual(JSON.parse(response.content), {
      type: Task.TYPE_CODE,
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
