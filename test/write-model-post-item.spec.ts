import { assert } from 'chai'
import { ItemEvent, ItemType } from '../src/domain/enums.js'
import { Item } from '../src/domain/item.js'
import { EntityVersion } from '../src/es/entity-version.js'
import { injectServices, startServer, stopServer } from '../src/index.js'
import { StatusCode } from '../src/server.js'
import { MockEventProjection, MockEventPublisher } from './mocks.js'
import { post } from './http.js'

describe('POST /item', () => {

  let publisher: MockEventPublisher
  let projection: MockEventProjection

  before(startServer)
  after(stopServer)

  beforeEach(() => {
    publisher = new MockEventPublisher()
    projection = new MockEventProjection()
    injectServices({ publisher, projection })
  })

  type Body = {
    title: string
    type?: ItemType
  }

  const addItem = (body: Body) => post('/item', body)

  it('publishes "Created" event', async () => {
    const response = await addItem({
      title: 'Produce some value',
      type: ItemType.Feature,
    })

    assert.equal(response.statusCode, StatusCode.Created)
    assert.equal(publisher.lastPublishedEntities[0]?.id.type, Item.TYPE_CODE)
    assert.equal(publisher.lastPublishedEntities[0]?.version, EntityVersion.new)
    assert.lengthOf(publisher.lastPublishedEvents, 1)
    assert.deepInclude(publisher.lastPublishedEvents[0], {
      actor: 'system_actor',
      event: {
        name: ItemEvent.Created,
        details: { title: 'Produce some value', type: ItemType.Feature },
      },
    })
  })

  it('projects "Created" event', async () => {
    await addItem({ title: 'Produce some value', type: ItemType.Feature })

    assert.lengthOf(projection.lastSyncedEvents, 1)
    assert.deepInclude(
      projection.lastSyncedEvents[0],
      {
        name: ItemEvent.Created,
        details: { title: 'Produce some value', type: ItemType.Feature },
      })
    assert.equal(projection.lastSyncedEvents[0]?.entity.type, Item.TYPE_CODE)
  })
})
