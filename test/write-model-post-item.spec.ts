import { assert } from 'chai'
import { request } from 'http'
import { PORT } from '../src/config.js'
import { ItemEvent, ItemType } from '../src/domain/enums.js'
import { Item } from '../src/domain/item.js'
import { EntityVersion } from '../src/es/entity-version.js'
import { PublishedEvent } from '../src/es/published-event.js'
import { start, stop } from '../src/index.js'
import { StatusCode } from '../src/server.js'
import { MockEventProjection, MockEventPublisher } from './mocks.js'
import { readResponse } from './read-response.js'
import { Response } from './response.js'

describe('write model', () => {

  const publisher = new MockEventPublisher()
  const projection = new MockEventProjection()

  before(() => {
    start({ publisher, projection })
  })
  after(stop)

  beforeEach(() => {
    publisher.reset()
  })

  describe('POST /item', () => {

    it('publishes "Created" event', async () => {
      const response = await post({ title: 'Get shit done' })

      assert.equal(response.statusCode, StatusCode.Created)
      assert.equal(publisher.lastPublishedEntities[0]?.id.type, Item.TYPE_CODE)
      assert.equal(publisher.lastPublishedEntities[0]?.version, EntityVersion.new)
      assert.lengthOf(publisher.lastPublishedEvents, 1)
      assert.deepEqual(publisher.lastPublishedEvents[0], {
        actor: 'system_actor',
        event: new PublishedEvent(ItemEvent.Created, { title: 'Get shit done', type: ItemType.Task }),
      })
    })

    it('projects "Created" event', async () => {
      await post({ title: 'Get shit done' })

      assert.lengthOf(projection.lastSyncedEvents, 1)
      assert.deepInclude(
        projection.lastSyncedEvents[0],
        {
          name: ItemEvent.Created,
          details: { title: 'Get shit done', type: ItemType.Task },
        })
      assert.equal(projection.lastSyncedEvents[0]?.entity.type, Item.TYPE_CODE)
    })

    it('returns the created id', async () => {
      const response = await post({ title: 'Get shit done' })

      assert.equal(response.statusCode, StatusCode.Created)
      assert.deepEqual(JSON.parse(response.content), publisher.lastPublishedEntities[0]?.id)
    })
  })

  describe('POST /item (feature)', () => {

    it('publishes "Created" event', async () => {
      const response = await post({
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
      await post({ title: 'Produce some value', type: ItemType.Feature })

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
})

type Body = {
  title: string
  type?: ItemType
}

function post(body: Body) {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/item',
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
