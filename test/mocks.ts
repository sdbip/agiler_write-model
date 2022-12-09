import { CanonicalEntityId } from '../src/es/canonical-entity-id.js'
import { EntityHistory } from '../src/es/entity-history.js'
import { EntityRepository } from '../src/es/entity-repository.js'
import { Entity, EventPublisher } from '../src/es/event-publisher.js'
import { UnpublishedEvent } from '../src/es/unpublished-event.js'


export class MockEventRepository implements EntityRepository {
  nextHistory?: EntityHistory
  lastRequestedEntity?: CanonicalEntityId

  async getHistoryFor(entity: CanonicalEntityId): Promise<EntityHistory | undefined> {
    this.lastRequestedEntity = entity
    return this.nextHistory
  }
}

export class MockEventPublisher implements EventPublisher {
  async publish(event: UnpublishedEvent, entity: CanonicalEntityId, actor: string) {
    //
  }

  lastPublishedEntity?: Entity
  lastPublishedActor?: string

  async publishChanges(entity: Entity, actor: string): Promise<void> {
    this.lastPublishedActor = actor
    this.lastPublishedEntity = { ...entity }
  }
}
