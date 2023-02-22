import { assert } from 'chai'
import { EntityVersion } from '../src/es/source.js'
import { ItemEvent, ItemType } from '../src/domain/enums.js'
import { Item } from '../src/domain/item.js'
import { injectServices, startServer, stopServer } from '../src/index.js'
import { StatusCode } from '../src/response.js'
import { MockEventProjection, MockEventPublisher } from './mocks.js'
import { post } from './http.js'

describe('POST /task', () => {

  let publisher: MockEventPublisher
  let projection: MockEventProjection
  let authenticatedUser: string | undefined

  before(startServer)
  after(stopServer)

  beforeEach(() => {
    publisher = new MockEventPublisher()
    projection = new MockEventProjection()
    authenticatedUser = 'some_user'
    injectServices({ publisher, projection })
  })

  type Body = {
    title: string
    type?: ItemType
  }

  const addTask = (body: Body) => post('/task', { ... authenticatedUser && { authorization: authenticatedUser }, body })

  it('publishes "Created" event', async () => {
    const response = await addTask({
      title: 'Produce some value',
    })

    assert.equal(response.statusCode, StatusCode.Created)
    assert.equal(publisher.lastPublishedEntities[0]?.id.type, Item.TYPE_CODE)
    assert.equal(publisher.lastPublishedEntities[0]?.version, EntityVersion.new)
    assert.lengthOf(publisher.lastPublishedEvents, 1)
    assert.deepInclude(publisher.lastPublishedEvents[0], {
      event: {
        name: ItemEvent.Created,
        details: { title: 'Produce some value', type: ItemType.Task },
      },
    })
  })

  it('assigns the authenticated username to the event', async () => {
    authenticatedUser = 'the_user'

    await addTask({
      title: 'Produce some value',
    })

    assert.deepInclude(publisher.lastPublishedEvents[0], {
      actor: 'the_user',
    })
  })

  it('projects "Created" event', async () => {
    await addTask({ title: 'Produce some value' })

    assert.lengthOf(projection.lastSyncedEvents, 1)
    assert.deepInclude(
      projection.lastSyncedEvents[0],
      {
        name: ItemEvent.Created,
        details: { title: 'Produce some value', type: ItemType.Task },
      })
    assert.equal(projection.lastSyncedEvents[0]?.entity.type, Item.TYPE_CODE)
  })

  it('returns 401 if not authenticated', async () => {
    authenticatedUser = undefined
    const response = await addTask({ title: 'Produce some value', type: ItemType.Feature })

    assert.equal(response.statusCode, StatusCode.Unauthorized)
  })
})
