import { assert } from 'chai'
import { EntityHistory, EntityVersion, PublishedEvent } from '../src/es/source.js'
import { ItemEvent, ItemType } from '../src/domain/enums.js'
import { injectServices, startServer, stopServer } from '../src/index.js'
import { StatusCode } from '../src/response.js'
import { MockEntityRepository, MockEventProjection, MockEventPublisher } from './mocks.js'
import { post } from './http.js'

describe('POST /item/:id/child', () => {

  let publisher: MockEventPublisher
  let projection: MockEventProjection
  let repository: MockEntityRepository

  before(startServer)
  after(stopServer)

  beforeEach(() => {
    publisher = new MockEventPublisher()
    projection = new MockEventProjection()
    repository = new MockEntityRepository()
    injectServices({ repository, publisher, projection })
  })

  type Body = {
    title: string
    type: ItemType
  }

  const addChild = async (parentId: string, body: Body) => post(`/item/${parentId}/child`, { authorization: 'system_actor', body })

  it('publishes "ChildrenAdded" and "ParentChanged" events', async () => {
    repository.nextHistory = new EntityHistory('Item', EntityVersion.of(0), [
      new PublishedEvent(ItemEvent.TypeChanged, { type: ItemType.Feature }),
    ])

    const response = await addChild('epic_id', { title: 'Produce some value', type: ItemType.Feature })

    assert.equal(response.statusCode, StatusCode.Created)
    assert.equal(repository.lastRequestedId, 'epic_id')

    const createdEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.Created)
    const childrenAddedEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.ChildrenAdded)
    const parentChangedEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.ParentChanged)
    assert.deepInclude(childrenAddedEvent, {
      actor: 'system_actor',
      event: {
        name: ItemEvent.ChildrenAdded,
        details: { children: [ JSON.parse(response.content).id ] },
      },
    })
    assert.deepInclude(parentChangedEvent, {
      actor: 'system_actor',
      event: {
        name: ItemEvent.ParentChanged,
        details: { parent: 'epic_id' },
      },
    })
    assert.deepInclude(createdEvent, {
      actor: 'system_actor',
      event: {
        name: ItemEvent.Created,
        details: { title: 'Produce some value', type: ItemType.Feature },
      },
    })
  })

  it('projects events', async () => {
    repository.nextHistory = new EntityHistory('Item', EntityVersion.of(0), [
      new PublishedEvent(ItemEvent.TypeChanged, { type: ItemType.Feature }),
    ])

    await addChild('story_id', { title: 'Produce some value', type: ItemType.Feature })

    assert.lengthOf(projection.lastSyncedEvents, 4)
  })

  it('returns 404 if parent not found', async () => {
    const response = await addChild('epic_id', { title: 'Produce some value', type: ItemType.Feature })

    assert.equal(response.statusCode, StatusCode.NotFound)
  })

  it('returns 404 if parent is not an Item', async () => {
    repository.nextHistory = new EntityHistory('NotItem', EntityVersion.of(0), [])
    const response = await addChild('epic_id', { title: 'Produce some value', type: ItemType.Feature })
    assert.equal(response.statusCode, StatusCode.NotFound)
  })
})
