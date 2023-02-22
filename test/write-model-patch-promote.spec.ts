import { assert } from 'chai'
import { EntityHistory, EntityVersion } from '../src/es/source.js'
import { ItemEvent, ItemType } from '../src/domain/enums.js'
import { Task } from '../src/domain/task.js'
import { injectServices, startServer, stopServer } from '../src/index.js'
import { StatusCode } from '../src/response.js'
import { MockEventPublisher, MockEntityRepository, MockEventProjection } from './mocks.js'
import { patch } from './http.js'

describe('PATCH /item/:id/promote', () => {

  let repository: MockEntityRepository
  let publisher: MockEventPublisher
  let projection: MockEventProjection
  let authenticatedUser: string | undefined

  before(startServer)
  after(stopServer)

  beforeEach(() => {
    repository = new MockEntityRepository()
    publisher = new MockEventPublisher()
    projection = new MockEventProjection()
    authenticatedUser = 'some_user'

    injectServices({ repository, publisher, projection })
  })

  const promote = (id: string) => patch(`/item/${id}/promote`, { ...{ authorization: authenticatedUser } })

  it('publishes "TypeChanged" event when items are promoted', async () => {
    repository.nextHistory = new EntityHistory(Task.TYPE_CODE, EntityVersion.of(0), [])
    const response = await promote('id')

    assert.equal(response.statusCode, StatusCode.NoContent)
    assert.deepEqual(repository.lastRequestedId, 'id')
    assert.lengthOf(publisher.lastPublishedEvents as never[], 1)
    assert.deepInclude(
      publisher.lastPublishedEvents[0],
      {
        event: {
          name: ItemEvent.TypeChanged,
          details: { type: ItemType.Story },
        },
      })
    assert.equal(publisher.lastPublishedEntities[0]?.id.type, Task.TYPE_CODE)
  })

  it('assigns the authenticated username to the event', async () => {
    repository.nextHistory = new EntityHistory(Task.TYPE_CODE, EntityVersion.of(0), [])
    authenticatedUser = 'the_user'
    await promote('id')

    assert.deepInclude(
      publisher.lastPublishedEvents[0],
      {
        actor: 'the_user',
      })
  })

  it('projects "Created" event', async () => {
    repository.nextHistory = new EntityHistory(Task.TYPE_CODE, EntityVersion.of(0), [])
    await promote('id')

    assert.lengthOf(projection.lastSyncedEvents, 1)
    assert.deepInclude(
      projection.lastSyncedEvents[0],
      {
        name: ItemEvent.TypeChanged,
        details: { type: ItemType.Story },
      })
    assert.equal(projection.lastSyncedEvents[0]?.entity.type, Task.TYPE_CODE)
  })

  it('returns 401 if not authenticated', async () => {
    authenticatedUser = undefined
    const response = await promote('id')

    assert.equal(response.statusCode, StatusCode.Unauthorized)
  })

  it('returns 404 if not found', async () => {
    const response = await promote('id')

    assert.equal(response.statusCode, StatusCode.NotFound)
  })

  it('returns 404 if not an Item', async () => {
    repository.nextHistory = new EntityHistory('NotItem', EntityVersion.of(0), [])
    const response = await promote('id')

    assert.equal(response.statusCode, StatusCode.NotFound)
  })
})
