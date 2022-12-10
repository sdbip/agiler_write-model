import { EntityRepository } from '../src/EntityRepository.js'
import { CanonicalEntityId } from '../src/es/canonical-entity-id.js'
import { EntityHistory } from '../src/es/entity-history.js'
import { Entity, EventPublisher } from '../src/es/event-publisher.js'
import { PublishedEvent } from '../src/es/published-event.js'


export class MockEntityRepository implements EntityRepository {
  nextHistory?: EntityHistory
  lastRequestedEntity?: CanonicalEntityId

  async getHistoryFor(entity: CanonicalEntityId): Promise<EntityHistory | undefined> {
    this.lastRequestedEntity = entity
    return this.nextHistory
  }
}

export class MockEventPublisher implements EventPublisher {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async publish() { }

  lastPublishedEntity?: Entity
  lastPublishedActor?: string
  publishedEvents: any[] = []

  async publishChanges(entity: Entity, actor: string): Promise<void> {
    this.lastPublishedActor = actor
    this.lastPublishedEntity = { ...entity }
    this.publishedEvents = entity.unpublishedEvents.map(e => ({
      actor,
      event: new PublishedEvent(
        e.name,
        e.details,
      ),
    }))
  }
}
