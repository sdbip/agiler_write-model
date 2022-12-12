import { Event, EventProjection } from '../src/es/event-projection.js'
import * as source from '../src/es/source.js'

export class MockEventProjection extends EventProjection {
  lastSyncedEvents: Event[] = []

  async sync(events: Event[]) {
    this.lastSyncedEvents = events
  }
}

export class MockEntityRepository implements source.EntityRepository {
  nextHistory?: source.EntityHistory
  lastRequestedId?: string

  async getHistoryFor(id: string): Promise<source.EntityHistory | undefined> {
    this.lastRequestedId = id
    return this.nextHistory
  }
}

export class MockEventPublisher implements source.EventPublisher {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async publish() { }

  lastPublishedActor?: string
  lastPublishedEntities: source.Entity[] = []
  lastPublishedEvents: { actor: string, event: source.PublishedEvent }[] = []

  async publishChanges(entity: source.Entity | source.Entity[], actor: string): Promise<void> {
    const entities = entity instanceof Array ? entity : [ entity ]
    this.lastPublishedActor = actor
    this.lastPublishedEntities = entities
    this.lastPublishedEvents = entities
      .map(e => e.unpublishedEvents)
      .flat()
      .map(e => ({
        actor,
        event: new source.PublishedEvent(
          e.name,
          e.details,
        ),
      }))
  }
}
