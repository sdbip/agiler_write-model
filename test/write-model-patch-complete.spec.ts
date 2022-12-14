import { assert } from 'chai'
import { ItemEvent, Progress } from '../src/domain/enums.js'
import { Item } from '../src/domain/item.js'
import { injectServices, startServer, stopServer } from '../src/index.js'
import { StatusCode } from '../src/server.js'
import * as mocks from './mocks.js'
import { patch } from './http.js'
import { EntityHistory, EntityVersion } from '../src/es/source.js'

describe('PATCH /item/:id/complete', () => {

  let repository: mocks.MockEntityRepository
  let publisher: mocks.MockEventPublisher
  let projection: mocks.MockEventProjection

  before(startServer)
  after(stopServer)

  beforeEach(() => {
    repository = new mocks.MockEntityRepository()
    publisher = new mocks.MockEventPublisher()
    projection = new mocks.MockEventProjection()
    injectServices({ repository, publisher, projection })
  })

  const complete = (id: string) => patch(`/item/${id}/complete`)

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
