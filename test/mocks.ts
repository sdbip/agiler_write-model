import { EntityRepository } from '../src/EntityRepository.js'
import { EntityHistory } from '../src/es/entity-history.js'
import { Entity, EventPublisher } from '../src/es/event-publisher.js'
import { PublishedEvent } from '../src/es/published-event.js'


export class MockEntityRepository implements EntityRepository {
  nextHistory?: EntityHistory
  lastRequestedId?: string

  async getHistoryFor(id: string): Promise<EntityHistory | undefined> {
    this.lastRequestedId = id
    return this.nextHistory
  }

  reset() {
    this.nextHistory = undefined
    this.lastRequestedId = undefined
  }
}

export class MockEventPublisher implements EventPublisher {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async publish() { }

  lastPublishedActor?: string
  lastPublishedEntities: Entity[] = []
  lastPublishedEvents: { actor: string, event: PublishedEvent }[] = []

  async publishChanges(entity: Entity | Entity[], actor: string): Promise<void> {
    const entities = entity instanceof Array ? entity : [ entity ]
    this.lastPublishedActor = actor
    this.lastPublishedEntities = entities
    this.lastPublishedEvents = entities
      .map(e => e.unpublishedEvents)
      .flat()
      .map(e => ({
        actor,
        event: new PublishedEvent(
          e.name,
          e.details,
        ),
      }))
  }

  reset() {
    this.lastPublishedActor = undefined
    this.lastPublishedEntities = []
    this.lastPublishedEvents = []
  }
}
