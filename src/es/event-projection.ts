import { CanonicalEntityId } from './canonical-entity-id'

export type Event = {
  entity: CanonicalEntityId,
  name: string,
  details: Record<string, unknown>,
}

export class EventProjection {

  async sync(events: Event[]) {
    //
  }
}
