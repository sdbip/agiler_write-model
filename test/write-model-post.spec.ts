import { assert } from 'chai'
import { request } from 'http'
import { PORT } from '../src/config.js'
import { ItemEvent, ItemType } from '../src/domain/enums.js'
import { Item } from '../src/domain/item.js'
import { EntityVersion } from '../src/es/entity-version.js'
import { UnpublishedEvent } from '../src/es/unpublished-event.js'
import { start, stop } from '../src/index.js'
import { StatusCode } from '../src/server.js'
import { MockEntityRepository, MockEventPublisher } from './mocks.js'
import { readResponse } from './read-response.js'
import { Response } from './response.js'

describe('write model', () => {

  const publisher = new MockEventPublisher()

  before(() => {
    start(new MockEntityRepository(), publisher)
  })
  after(stop)

  beforeEach(() => {
    publisher.lastPublishedActor = undefined
    publisher.lastPublishedEntity = undefined
  })

  describe('POST /item', () => {

    it('publishes "Created" event', async () => {
      await post({ title: 'Get shit done' })

      assert.equal(publisher.lastPublishedEntity?.id.type, Item.TYPE_CODE)
      assert.equal(publisher.lastPublishedEntity?.version, EntityVersion.new)
      assert.deepEqual(publisher.lastPublishedEntity?.unpublishedEvents, [
        new UnpublishedEvent(ItemEvent.Created, { title: 'Get shit done', type: ItemType.Task }),
      ])
    })

    it('returns the created id', async () => {
      const response = await post({ title: 'Get shit done' })

      assert.equal(response.statusCode, StatusCode.Created)
      assert.deepEqual(JSON.parse(response.content), publisher.lastPublishedEntity?.id)
    })
  })
})

type Body = {
  title: string
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
