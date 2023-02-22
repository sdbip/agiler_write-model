import { assert } from 'chai'
import { EntityHistory, EntityVersion, PublishedEvent } from '../src/es/source.js'
import { ItemEvent, ItemType } from '../src/domain/enums.js'
import { injectServices, startServer, stopServer } from '../src/index.js'
import { StatusCode } from '../src/response.js'
import { MockEntityRepository, MockEventProjection, MockEventPublisher } from './mocks.js'
import { post } from './http.js'
import { Feature } from '../src/domain/feature.js'

describe('POST /feature/:id/child', () => {

  let publisher: MockEventPublisher
  let projection: MockEventProjection
  let repository: MockEntityRepository
  let authenticatedUser: string | undefined

  before(startServer)
  after(stopServer)

  beforeEach(() => {
    publisher = new MockEventPublisher()
    projection = new MockEventProjection()
    repository = new MockEntityRepository()
    injectServices({ repository, publisher, projection })
    authenticatedUser = 'some_user'
  })

  type Body = {
    title: string
    type: ItemType
  }

  const addChild = async (parentId: string, body: Body) => post(`/feature/${parentId}/child`, { ...{ authorization: authenticatedUser }, body })

  it('publishes "ChildrenAdded" and "ParentChanged" events', async () => {
    repository.nextHistory = new EntityHistory(Feature.TYPE_CODE, EntityVersion.of(0), [
      new PublishedEvent(ItemEvent.TypeChanged, { type: ItemType.Feature }),
    ])

    const response = await addChild('parent_id', { title: 'Produce some value', type: ItemType.Feature })

    assert.equal(response.statusCode, StatusCode.Created)
    assert.equal(repository.lastRequestedId, 'parent_id')

    const createdEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.Created)
    const childrenAddedEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.ChildrenAdded)
    const parentChangedEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.ParentChanged)
    const typeChangedEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.TypeChanged)
    assert.deepInclude(childrenAddedEvent, {
      event: {
        name: ItemEvent.ChildrenAdded,
        details: { children: [ JSON.parse(response.content).id ] },
      },
    })
    assert.deepInclude(parentChangedEvent, {
      event: {
        name: ItemEvent.ParentChanged,
        details: { parent: 'parent_id' },
      },
    })
    assert.deepInclude(createdEvent, {
      event: {
        name: ItemEvent.Created,
        details: { title: 'Produce some value', type: ItemType.Feature },
      },
    })
    assert.deepInclude(typeChangedEvent, {
      event: {
        name: ItemEvent.TypeChanged,
        details: { type: ItemType.Epic },
      },
    })
  })

  it('assigns the authenticated user to the events', async () => {
    authenticatedUser = 'the_user'
    repository.nextHistory = new EntityHistory(Feature.TYPE_CODE, EntityVersion.of(0), [
      new PublishedEvent(ItemEvent.TypeChanged, { type: ItemType.Feature }),
    ])

    await addChild('parent_id', { title: 'Produce some value', type: ItemType.Feature })

    const createdEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.Created)
    const childrenAddedEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.ChildrenAdded)
    const parentChangedEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.ParentChanged)
    const typeChangedEvent = publisher.lastPublishedEvents.find(e => e.event.name === ItemEvent.TypeChanged)
    assert.deepInclude(childrenAddedEvent, {
      actor: 'the_user',
    })
    assert.deepInclude(parentChangedEvent, {
      actor: 'the_user',
    })
    assert.deepInclude(createdEvent, {
      actor: 'the_user',
    })
    assert.deepInclude(typeChangedEvent, {
      actor: 'the_user',
    })
  })

  it('projects events', async () => {
    repository.nextHistory = new EntityHistory(Feature.TYPE_CODE, EntityVersion.of(0), [
      new PublishedEvent(ItemEvent.TypeChanged, { type: ItemType.Feature }),
    ])

    await addChild('parent_id', { title: 'Produce some value', type: ItemType.Feature })

    assert.lengthOf(projection.lastSyncedEvents, 4)
  })

  it('returns 401 if not authenticated', async () => {
    authenticatedUser = undefined
    const response = await addChild('parent_id', { title: 'Produce some value', type: ItemType.Feature })

    assert.equal(response.statusCode, StatusCode.Unauthorized)
  })

  it('returns 404 if parent not found', async () => {
    const response = await addChild('parent_id', { title: 'Produce some value', type: ItemType.Feature })

    assert.equal(response.statusCode, StatusCode.NotFound)
  })

  it('returns 404 if parent is not an Item', async () => {
    repository.nextHistory = new EntityHistory('Unexpected TYPE CODE', EntityVersion.of(0), [])
    const response = await addChild('parent_id', { title: 'Produce some value', type: ItemType.Feature })
    assert.equal(response.statusCode, StatusCode.NotFound)
  })
})
