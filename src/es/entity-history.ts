import { EntityVersion } from './entity-version.js'
import { PublishedEvent } from './published-event.js'

export class EntityHistory {
  constructor(readonly version: EntityVersion, readonly events: PublishedEvent[]) { }
}
