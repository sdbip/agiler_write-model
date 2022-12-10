import { CanonicalEntityId } from './canonical-entity-id.js'
import { EntityVersion } from './entity-version.js'
import { failFast } from './fail-fast.js'
import { UnpublishedEvent } from './unpublished-event.js'

export abstract class Entity {
  readonly unpublishedEvents: UnpublishedEvent[] = []

  constructor(readonly id: CanonicalEntityId, readonly version: EntityVersion) {
    failFast.unlessInstanceOf(CanonicalEntityId)(id, 'id')
    failFast.unlessInstanceOf(EntityVersion)(version, 'version')
  }
}
