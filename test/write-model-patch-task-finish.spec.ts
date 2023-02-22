import { assert } from 'chai'
import { EntityHistory, EntityVersion } from '../src/es/source.js'
import { ItemEvent, Progress } from '../src/domain/enums.js'
import { injectServices, startServer, stopServer } from '../src/index.js'
import { StatusCode } from '../src/response.js'
import * as mocks from './mocks.js'
import { patch } from './http.js'
import { Task } from '../src/domain/task.js'

describe('PATCH /task/:id/finish', () => {

  let repository: mocks.MockEntityRepository
  let publisher: mocks.MockEventPublisher
  let projection: mocks.MockEventProjection
  let authenticatedUser: string | undefined

  before(startServer)
  after(stopServer)

  beforeEach(() => {
    repository = new mocks.MockEntityRepository()
    publisher = new mocks.MockEventPublisher()
    projection = new mocks.MockEventProjection()
    injectServices({ repository, publisher, projection })
    authenticatedUser = 'some_user'
  })

  const finish = (id: string) => patch(`/task/${id}/finish`, { ...authenticatedUser && { authorization: authenticatedUser } })

  it('publishes "ProgressChanged" event when tasks are finished', async () => {
    repository.nextHistory = new EntityHistory('Item', EntityVersion.of(0), [])
    const response = await finish('id')

    assert.equal(response.statusCode, StatusCode.NoContent)
    assert.deepEqual(repository.lastRequestedId, 'id')
    assert.lengthOf(publisher.lastPublishedEvents as never[], 1)
    assert.deepInclude(
      publisher.lastPublishedEvents[0],
      {
        event: {
          name: ItemEvent.ProgressChanged,
          details: { progress: Progress.Completed },
        },
      })
    assert.exists(publisher.lastPublishedEntities)
    assert.lengthOf(publisher.lastPublishedEntities, 1)
    assert.equal(publisher.lastPublishedEntities[0]?.id.type, Task.TYPE_CODE)
  })

  it('sets the actor to the authenticated user', async () => {
    repository.nextHistory = new EntityHistory('Item', EntityVersion.of(0), [])
    authenticatedUser = 'the_user'
    const response = await finish('id')

    assert.equal(response.statusCode, StatusCode.NoContent)
    assert.deepEqual(repository.lastRequestedId, 'id')
    assert.lengthOf(publisher.lastPublishedEvents as never[], 1)
    assert.deepInclude(
      publisher.lastPublishedEvents[0],
      {
        actor: 'the_user',
        event: {
          name: ItemEvent.ProgressChanged,
          details: { progress: Progress.Completed },
        },
      })
    assert.exists(publisher.lastPublishedEntities)
    assert.lengthOf(publisher.lastPublishedEntities, 1)
    assert.equal(publisher.lastPublishedEntities[0]?.id.type, Task.TYPE_CODE)
  })

  it('projects "Completed" event', async () => {
    repository.nextHistory = new EntityHistory('Item', EntityVersion.of(0), [])
    await finish('id')

    assert.lengthOf(projection.lastSyncedEvents, 1)
    assert.deepInclude(
      projection.lastSyncedEvents[0],
      {
        name: ItemEvent.ProgressChanged,
        details: { progress: Progress.Completed },
      })
    assert.equal(projection.lastSyncedEvents[0]?.entity.type, Task.TYPE_CODE)
  })

  it('returns 401 if not authenticated', async () => {
    authenticatedUser = undefined
    const response = await finish('id')

    assert.equal(response.statusCode, StatusCode.Unauthorized)
  })

  it('returns 404 if not found', async () => {
    const response = await finish('id')

    assert.equal(response.statusCode, StatusCode.NotFound)
  })

  it('returns 404 if not an Item', async () => {
    repository.nextHistory = new EntityHistory('NotItem', EntityVersion.of(0), [])
    const response = await finish('id')

    assert.equal(response.statusCode, StatusCode.NotFound)
  })
})
