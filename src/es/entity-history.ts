import { CanonicalEntityId } from './canonical-entity-id.js'
import { EntityVersion } from './entity-version.js'
import { PublishedEvent } from './published-event.js'

export class EntityHistory {
  constructor(readonly id: CanonicalEntityId, readonly version: EntityVersion, readonly events: PublishedEvent[]) { }
}
