import { assert } from 'chai'
import { request } from 'http'
import { PORT } from '../src/config.js'
import { ItemEvent, ItemType } from '../src/domain/enums.js'
import { Item } from '../src/domain/item.js'
import { CanonicalEntityId } from '../src/es/canonical-entity-id.js'
import { EntityHistory } from '../src/es/entity-history.js'
import { EntityVersion } from '../src/es/entity-version.js'
import { start, stop } from '../src/index.js'
import { StatusCode } from '../src/server.js'
import { MockEventPublisher, MockEntityRepository } from './mocks.js'
import { readResponse } from './read-response.js'
import { Response } from './response.js'

describe('write model', () => {

  describe('PATCH /item/:id/promote', () => {

    const repository = new MockEntityRepository()
    const publisher = new MockEventPublisher()

    before(() => {
      start(repository, publisher)
    })
    after(stop)

    beforeEach(() => {
      publisher.lastPublishedActor = undefined
      publisher.lastPublishedEntity = undefined
      repository.lastRequestedEntity = undefined
      repository.nextHistory = undefined
    })

    it('publishes "TypeChanged" event when items are promoted [PATCH /item/:id/promote]', async () => {
      repository.nextHistory = new EntityHistory(EntityVersion.of(0), [])
      const response = await promote('id')

      assert.equal(response.statusCode, StatusCode.NoContent)
      assert.deepEqual(repository.lastRequestedEntity, new CanonicalEntityId('id', Item.TYPE_CODE))
      assert.lengthOf(publisher.publishedEvents, 1)
      assert.deepInclude(
        publisher.publishedEvents[0],
        {
          actor: 'system_actor',
          event: {
            name: ItemEvent.TypeChanged,
            details: { type: ItemType.Story },
          },
        })
      assert.equal(publisher.lastPublishedEntity?.id.type, Item.TYPE_CODE)
    })

    it('returns 404 if not found [PATCH /item/:id/promote]', async () => {
      const response = await promote('id')

      assert.equal(response.statusCode, StatusCode.NotFound)
    })
  })
})

function promote(id: string) {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: `/item/${id}/promote`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': 0,
    },
  }

  return new Promise<Response>((resolve) => {
    const rq = request(options, async response => {
      const result = await readResponse(response)
      resolve(result)
    })

    rq.end()
  })
}
