import { CanonicalEntityId } from './es/canonical-entity-id'
import { EntityHistory } from './es/entity-history.js'

export interface EntityRepository {
  getHistoryFor(entity: CanonicalEntityId): Promise<EntityHistory | undefined>
}
