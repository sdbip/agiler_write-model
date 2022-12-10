import { assert } from 'chai'
import { request } from 'http'
import { PORT } from '../src/config.js'
import { ItemEvent, ItemType } from '../src/domain/enums.js'
import { EntityHistory } from '../src/es/entity-history.js'
import { EntityVersion } from '../src/es/entity-version.js'
import { PublishedEvent } from '../src/es/published-event.js'
import { start, stop } from '../src/index.js'
import { StatusCode } from '../src/server.js'
import { MockEntityRepository, MockEventPublisher } from './mocks.js'
import { readResponse } from './read-response.js'
import { Response } from './response.js'

describe('write model', () => {

  const publisher = new MockEventPublisher()
  const repository = new MockEntityRepository()

  before(() => {
    start(repository, publisher)
  })
  after(stop)

  beforeEach(() => {
    publisher.reset()
    repository.reset()
  })

  describe('POST /item/:id/child', () => {

    it('publishes "ChildrenAdded" and "ParentChanged" events', async () => {
      repository.nextHistory = new EntityHistory(EntityVersion.of(0), [
        new PublishedEvent(ItemEvent.TypeChanged, { type: ItemType.Feature }),
      ])

      const response = await post('epic_id', { title: 'Produce some value', type: ItemType.Feature })

      assert.equal(response.statusCode, StatusCode.Created)
      assert.equal(repository.lastRequestedEntity?.id, 'epic_id')

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

    it('returns 404 if story not found', async () => {
      const response = await post('story_id', { title: 'Produce some value' })

      assert.equal(response.statusCode, StatusCode.NotFound)
    })
  })

  describe('POST /item/:id/child (feature)', () => {

    it('publishes "ChildrenAdded" and "ParentChanged" events', async () => {
      repository.nextHistory = new EntityHistory(EntityVersion.of(0), [
        new PublishedEvent(ItemEvent.TypeChanged, { type: ItemType.Story }),
      ])

      const response = await post('story_id', { title: 'Get Shit Done' })

      assert.equal(response.statusCode, StatusCode.Created)
      assert.equal(repository.lastRequestedEntity?.id, 'story_id')

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
          details: { parent: 'story_id' },
        },
      })
      assert.deepInclude(createdEvent, {
        actor: 'system_actor',
        event: {
          name: ItemEvent.Created,
          details: { title: 'Get Shit Done', type: ItemType.Task },
        },
      })
    })

    it('returns 404 if story not found', async () => {
      const response = await post('epic_id', { title: 'Get Shit Done' })

      assert.equal(response.statusCode, StatusCode.NotFound)
    })
  })
})

type Body = {
  title: string
  type?: ItemType
}

function post(parentId: string, body: Body) {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: `/item/${parentId}/child`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': JSON.stringify(body).length,
    },
  }

  return new Promise<Response>((resolve) => {
    const rq = request(options, async response => {
      const result = await readResponse(response)
      resolve(result)
    })

    rq.end(JSON.stringify(body))
  })
}
