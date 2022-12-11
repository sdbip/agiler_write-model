import { assert } from 'chai'
import { request } from 'http'
import { PORT } from '../src/config.js'
import { ItemEvent, Progress } from '../src/domain/enums.js'
import { Item } from '../src/domain/item.js'
import { EntityHistory } from '../src/es/entity-history.js'
import { EntityVersion } from '../src/es/entity-version.js'
import { injectServices, startServer, stopServer } from '../src/index.js'
import { StatusCode } from '../src/server.js'
import { MockEventPublisher, MockEntityRepository, MockEventProjection } from './mocks.js'
import { readResponse } from './read-response.js'
import { Response } from './response.js'

describe('write model', () => {

  let repository: MockEntityRepository
  let publisher: MockEventPublisher
  let projection: MockEventProjection

  before(startServer)
  after(stopServer)

  beforeEach(() => {
    repository = new MockEntityRepository()
    publisher = new MockEventPublisher()
    projection = new MockEventProjection()
    injectServices({ repository, publisher, projection })
  })

  describe('PATCH /item/:id/complete', () => {

    it('publishes "ProgressChanged" event when items are completed', async () => {
      repository.nextHistory = new EntityHistory('Item', EntityVersion.of(0), [])
      const response = await complete('id')

      assert.equal(response.statusCode, StatusCode.NoContent)
      assert.deepEqual(repository.lastRequestedId, 'id')
      assert.lengthOf(publisher.lastPublishedEvents as never[], 1)
      assert.deepInclude(
        publisher.lastPublishedEvents[0],
        {
          actor: 'system_actor',
          event: {
            name: ItemEvent.ProgressChanged,
            details: { progress: Progress.Completed },
          },
        })
      assert.exists(publisher.lastPublishedEntities)
      assert.lengthOf(publisher.lastPublishedEntities, 1)
      assert.equal(publisher.lastPublishedEntities[0]?.id.type, Item.TYPE_CODE)
    })

    it('projects "Completed" event', async () => {
      repository.nextHistory = new EntityHistory('Item', EntityVersion.of(0), [])
      await complete('id')

      assert.lengthOf(projection.lastSyncedEvents, 1)
      assert.deepInclude(
        projection.lastSyncedEvents[0],
        {
          name: ItemEvent.ProgressChanged,
          details: { progress: Progress.Completed },
        })
      assert.equal(projection.lastSyncedEvents[0]?.entity.type, Item.TYPE_CODE)
    })

    it('returns 404 if not found', async () => {
      const response = await complete('id')

      assert.equal(response.statusCode, StatusCode.NotFound)
    })

    it('returns 404 if not an Item', async () => {
      repository.nextHistory = new EntityHistory('NotItem', EntityVersion.of(0), [])
      const response = await complete('id')

      assert.equal(response.statusCode, StatusCode.NotFound)
    })
  })
})

function complete(id: string) {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: `/item/${id}/complete`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': 0,
    },
  }

  return new Promise<Response>((resolve) => {
    const rq = request(options, async response => {
      const result = await readResponse(response)
      resolve(result)
    })

    rq.end()
  })
}
